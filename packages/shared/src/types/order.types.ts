import { ColorMode, PaperSize, Orientation } from '../constants/printConfig';

export interface PrintConfig {
  colorMode: ColorMode;
  paperSize: PaperSize;
  orientation: Orientation;
  copies: number;
  duplex: boolean;
  pageRange: string | null;
}
