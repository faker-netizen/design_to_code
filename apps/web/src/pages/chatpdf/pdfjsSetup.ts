import {pdfjs} from "react-pdf";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

/** 版本须与 react-pdf 内置 pdfjs-dist 一致（见 apps/web/package.json） */
if (pdfjs.version !== "5.4.296") {
    console.warn(`[chatpdf] pdfjs worker ${pdfjs.version} may mismatch react-pdf; expected 5.4.296`);
}

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
