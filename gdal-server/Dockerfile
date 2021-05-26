FROM osgeo/gdal:alpine-normal-latest
WORKDIR /usr/src/app
COPY requirements.txt requirements.txt
RUN apk add --no-cache python3 py3-pip py3-rasterio py3-pillow
RUN pip3 install -r requirements.txt
COPY . .
CMD [ "python3", "-m" , "flask", "run", "--host=0.0.0.0"]
