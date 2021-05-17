import json
import uuid

from flask import Flask, jsonify, request, send_from_directory, after_this_request
from pathlib import Path
from osgeo import gdal, ogr

APP_FOLDER = '/usr/src/app'
UPLOAD_FOLDER = APP_FOLDER + '/uploads'
OUTPUT_FOLDER = APP_FOLDER + '/output'

app = Flask(__name__)

def save_file(file):
    name = str(uuid.uuid1())
    path = Path(UPLOAD_FOLDER) / name
    file.save(path)
    return path

@app.before_first_request
def before_first_request():
    Path(UPLOAD_FOLDER).mkdir(exist_ok=True)
    Path(OUTPUT_FOLDER).mkdir(exist_ok=True)

@app.route('/polygonize', methods=['POST'])
def polygonize():
    file = request.files['file']
    path = save_file(file)
    
    shp_name = path.name
    out_path = Path(OUTPUT_FOLDER) / (shp_name + '.json')
    src_ds = gdal.Open(str(path))
    driver = gdal.GetDriverByName('GeoJSON')
    target_ds = driver.Create(str(out_path), src_ds.RasterXSize, src_ds.RasterYSize)
    target_layer = target_ds.CreateLayer(shp_name)

    gdal.Polygonize(src_ds.GetRasterBand(1), src_ds.GetRasterBand(1), target_layer, -1)

    src_ds = None
    target_ds = None

    @after_this_request 
    def remove_files(response): 
        path.unlink()
        out_path.unlink()
        return response 

    with open(out_path) as file:
        return jsonify(json.load(file)['features'])

@app.route('/rasterize', methods=['POST'])
def rasterize():
    file = request.files['file']
    path = save_file(file, 'shp')

    src_ds = ogr.Open(str(path))

    gdal.Rasterize(OUTPUT_FOLDER + '/image.tiff', src_ds)

    return send_from_directory(OUTPUT_FOLDER, 'image.tiff')