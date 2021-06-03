import json
import uuid

from io import BytesIO
from flask import Flask, jsonify, request, send_file
from pathlib import Path
from osgeo import gdal, ogr

import rasterio.features
from PIL import Image

APP_FOLDER = '/usr/src/app'
UPLOAD_FOLDER = APP_FOLDER + '/uploads'
OUTPUT_FOLDER = APP_FOLDER + '/output'

COLORS = { 0: 255, 1: 160, 2: 64 }

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


def features_to_shapes(features, grayscale, true_positive, false_positive, false_negative):
    for feature in features:
        grade = feature['properties']['grade']
        if (grade == 0 and true_positive) or (grade == 1 and false_positive) or (grade == 2 and false_negative):
            yield (feature['geometry'], COLORS[grade] if grayscale else 255)


@app.route('/rasterize', methods=['POST'])
def rasterize():
    data = request.get_json()
    width = data['width']
    height = data['height']
    features = data['features']
    
    grayscale = int(request.args.get('grayscale', '0'))
    true_positive = int(request.args.get('true-positive', '1'))
    false_positive = int(request.args.get('false-positive', '1'))
    false_negative = int(request.args.get('false-negative', '1'))

    shapes = features_to_shapes(features, grayscale, true_positive, false_positive, false_negative)
    raster = rasterio.features.rasterize(shapes, out_shape=(height, width))
    img = Image.fromarray(raster)
    img_stream = BytesIO()
    img.save(img_stream, format='TIFF', compression='packbits')
    img_stream.seek(0)

    return send_file(img_stream, mimetype='image/tiff')
