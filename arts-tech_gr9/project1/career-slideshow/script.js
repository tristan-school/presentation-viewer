document.addEventListener("DOMContentLoaded", () => {
  // CONFIGURATION: Set your local PDF file path here
  const PDF_FILE_PATH = "slideshow.pdf";

  // Configure PDF.js worker location
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

  const canvas = document.getElementById("pdf-canvas");
  const ctx = canvas.getContext("2d");
  const loadingMsg = document.getElementById("loading-msg");
  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");
  const currentSlideEl = document.getElementById("current-slide");
  const totalSlidesEl = document.getElementById("total-slides");

  let pdfDoc = null;
  let pageNum = 1;
  let pageRendering = false;
  let pageNumPending = null;

  // Fetch and load PDF document
  pdfjsLib
    .getDocument(PDF_FILE_PATH)
    .promise.then((pdf) => {
      pdfDoc = pdf;
      totalSlidesEl.textContent = pdfDoc.numPages;
      loadingMsg.style.display = "none";
      canvas.style.display = "block";

      renderPage(pageNum);
    })
    .catch((err) => {
      console.error(err);
      loadingMsg.style.color = "#ef4444";
      loadingMsg.textContent = `Error loading '${PDF_FILE_PATH}'. Make sure the file exists in the folder.`;
    });

  // Render a specific page/slide on the canvas
  function renderPage(num) {
    pageRendering = true;

    pdfDoc.getPage(num).then((page) => {
      // Calculate scale to match crisp device retina pixels
      const viewport = page.getViewport({ scale: 2.0 });

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: ctx,
        viewport: viewport,
      };

      const renderTask = page.render(renderContext);

      renderTask.promise.then(() => {
        pageRendering = false;

        if (pageNumPending !== null) {
          renderPage(pageNumPending);
          pageNumPending = null;
        }
      });
    });

    currentSlideEl.textContent = num;
    updateControls();
  }

  function queueRenderPage(num) {
    if (pageRendering) {
      pageNumPending = num;
    } else {
      renderPage(num);
    }
  }

  function updateControls() {
    prevBtn.disabled = pageNum <= 1;
    nextBtn.disabled = !pdfDoc || pageNum >= pdfDoc.numPages;
  }

  // Navigation Button Handlers
  prevBtn.addEventListener("click", () => {
    if (pageNum <= 1) return;
    pageNum--;
    queueRenderPage(pageNum);
  });

  nextBtn.addEventListener("click", () => {
    if (pageNum >= pdfDoc.numPages) return;
    pageNum++;
    queueRenderPage(pageNum);
  });

  // Keyboard Arrow Navigation
  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      if (pageNum > 1) {
        pageNum--;
        queueRenderPage(pageNum);
      }
    } else if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") {
      if (pdfDoc && pageNum < pdfDoc.numPages) {
        pageNum++;
        queueRenderPage(pageNum);
      }
    }
  });
});
