import json
import uuid

from io import BytesIO
from flask import Flask, jsonify, request, send_file, after_this_request
from pathlib import Path
from osgeo import gdal, ogr

import rasterio.features
from PIL import Image

APP_FOLDER = '/usr/src/app'
UPLOAD_FOLDER = APP_FOLDER + '/uploads'
OUTPUT_FOLDER = APP_FOLDER + '/output'

app = Flask(__name__)


def save_file(stream):
    name = str(uuid.uuid1())
    path = Path(UPLOAD_FOLDER) / name
    with open(path, 'bw') as file:
        chunk_size = 4096
        chunk = stream.read(chunk_size)
        while len(chunk) != 0:
            file.write(chunk)
            chunk = stream.read(chunk_size)
    return path


@app.before_first_request
def before_first_request():
    Path(UPLOAD_FOLDER).mkdir(exist_ok=True)
    Path(OUTPUT_FOLDER).mkdir(exist_ok=True)


@app.route('/polygonize', methods=['POST'])
def polygonize():
    path = save_file(request.stream)

    shp_name = path.name
    out_path = Path(OUTPUT_FOLDER) / (shp_name + '.json')

    src_ds = gdal.Open(str(path))
    driver = gdal.GetDriverByName('GeoJSON')
    target_ds = driver.Create(str(out_path), src_ds.RasterXSize, src_ds.RasterYSize)
    target_layer = target_ds.CreateLayer(shp_name)

    gdal.Polygonize(src_ds.GetRasterBand(1), src_ds.GetRasterBand(1), target_layer, -1)

    src_ds = None
    target_ds = None

    with open(out_path) as file:
        features = json.load(file)['features']

    path.unlink()
    out_path.unlink()

    return jsonify(features)


@app.route('/rasterize', methods=['POST'])
def rasterize():
    data = request.get_json()
    width = data['width']
    height = data['height']
    features = data['features']

    shapes = ((f['geometry'], 255) for f in features)
    raster = rasterio.features.rasterize(shapes, out_shape=(height, width))
    img = Image.fromarray(raster)
    img_stream = BytesIO()
    img.save(img_stream, format='TIFF', compression='packbits')
    img_stream.seek(0)

    return send_file(img_stream, mimetype='image/tiff')


def pixel_value(f):
    p = f['properties']
    if 'grade' in p and p['grade'] is not None:
        VALUES = { 0: 192, 1: 144, 2: 96, 3: 48 }
        return VALUES[p['grade']]

    return 255


@app.route('/rasterize-grayscale', methods=["POST"])
def rasterize_grayscale():
    data = request.get_json()
    width = data['width']
    height = data['height']
    features = data['features']

    shapes = ((f['geometry'], pixel_value(f)) for f in features)
    raster = rasterio.features.rasterize(shapes, out_shape=(height, width))
    img = Image.fromarray(raster)

    out_path = Path(OUTPUT_FOLDER) / (str(uuid.uuid1()) + '.tif')

    img.save(str(out_path))

    @after_this_request
    def remove_file(response):
        out_path.unlink()
        return response

    return send_file(out_path)
