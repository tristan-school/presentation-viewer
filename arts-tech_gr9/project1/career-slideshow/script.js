document.addEventListener("DOMContentLoaded", () => {
  const PDF_FILE_PATH = "presentation.pdf";

  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

  const stage = document.getElementById("slide-stage");
  const loadingMsg = document.getElementById("loading-msg");
  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");
  const currentSlideEl = document.getElementById("current-slide");
  const totalSlidesEl = document.getElementById("total-slides");

  const canvasA = document.createElement("canvas");
  const canvasB = document.createElement("canvas");

  canvasA.className = "slide-canvas active";
  canvasB.className = "slide-canvas";

  stage.appendChild(canvasA);
  stage.appendChild(canvasB);

  let activeCanvas = canvasA;
  let hiddenCanvas = canvasB;

  let pdfDoc = null;
  let pageNum = 1;
  let pageRendering = false;
  let pageNumPending = null;

  pdfjsLib
    .getDocument(PDF_FILE_PATH)
    .promise.then((pdf) => {
      pdfDoc = pdf;
      totalSlidesEl.textContent = pdfDoc.numPages;
      loadingMsg.style.display = "none";

      renderPage(pageNum);
    })
    .catch((err) => {
      console.error(err);
      loadingMsg.style.color = "#ef4444";
      loadingMsg.textContent = `Error loading '${PDF_FILE_PATH}'. Make sure the file exists in the directory.`;
    });

  function renderPage(num) {
    pageRendering = true;

    pdfDoc.getPage(num).then((page) => {
      // Get unscaled viewport to determine aspect ratio
      const unscaledViewport = page.getViewport({ scale: 1.0 });

      // Calculate container bounds (accounting for device pixel ratio for crisp rendering)
      const containerWidth = stage.clientWidth;
      const containerHeight = stage.clientHeight;
      const dpr = window.devicePixelRatio || 1;

      // Fit inside container bounds while maintaining aspect ratio
      const scaleX = containerWidth / unscaledViewport.width;
      const scaleY = containerHeight / unscaledViewport.height;
      const fitScale = Math.min(scaleX, scaleY);

      // Final high-DPI viewport
      const viewport = page.getViewport({ scale: fitScale * dpr });

      // Set internal pixel buffer size (crisp graphics)
      hiddenCanvas.width = Math.floor(viewport.width);
      hiddenCanvas.height = Math.floor(viewport.height);

      // Set CSS display size to fit container exactly
      hiddenCanvas.style.width = `${Math.floor(viewport.width / dpr)}px`;
      hiddenCanvas.style.height = `${Math.floor(viewport.height / dpr)}px`;

      const ctx = hiddenCanvas.getContext("2d");
      const renderContext = {
        canvasContext: ctx,
        viewport: viewport,
      };

      const renderTask = page.render(renderContext);

      renderTask.promise.then(() => {
        hiddenCanvas.classList.add("active");
        activeCanvas.classList.remove("active");

        const temp = activeCanvas;
        activeCanvas = hiddenCanvas;
        hiddenCanvas = temp;

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

  // Handle window resizing dynamically
  let resizeTimeout;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      if (pdfDoc && !pageRendering) {
        renderPage(pageNum);
      }
    }, 200);
  });

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
