import { Feature, Polygon } from 'geojson';

export interface AnnotationData {
  features: Feature<Polygon, any>[]
}
