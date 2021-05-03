import * as L from 'leaflet';

export interface GeoJson {
  type: 'Polygon' | 'MultiPolygon',
  coordinates: L.PointTuple[][] | L.PointTuple[][][]
}
