import { ImageInfo } from "./image-info.type";

export interface MaskInfo extends ImageInfo {
  overallScore: number | null
}
