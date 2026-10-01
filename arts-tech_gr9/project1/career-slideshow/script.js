document.addEventListener("DOMContentLoaded", () => {
  // CONFIGURATION: Set the filename of your local presentation here
  const PPTX_FILE_PATH = "presentation.pptx";

  const slideStage = document.getElementById("slide-stage");
  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");
  const currentSlideEl = document.getElementById("current-slide");
  const totalSlidesEl = document.getElementById("total-slides");

  let slides = [];
  let currentSlideIndex = 0;

  // Load the presentation from local directory on page load
  loadLocalPresentation(PPTX_FILE_PATH);

  async function loadLocalPresentation(filePath) {
    try {
      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error(`File '${filePath}' not found in directory.`);
      }

      const buffer = await response.arrayBuffer();
      const zip = await JSZip.loadAsync(buffer);

      // Extract all slide XML files from the PPTX zip structure
      const slideFiles = Object.keys(zip.files).filter((fileName) =>
        fileName.match(/^ppt\/slides\/slide\d+\.xml$/)
      );

      // Sort slides numerically (slide1.xml, slide2.xml, etc.)
      slideFiles.sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)[0], 10);
        const numB = parseInt(b.match(/\d+/)[0], 10);
        return numA - numB;
      });

      if (slideFiles.length === 0) {
        showError("No slides found in the presentation file.");
        return;
      }

      // Parse XML content for each slide
      slides = [];
      for (let i = 0; i < slideFiles.length; i++) {
        const xmlText = await zip.files[slideFiles[i]].async("string");
        const slideElement = parseSlideXML(xmlText, i + 1);
        slides.push(slideElement);
      }

      renderSlides();
      showSlide(0);
    } catch (err) {
      console.error(err);
      showError(err.message || "Failed to load presentation.");
    }
  }

  // Parse raw slide XML and construct clean HTML elements
  function parseSlideXML(xmlString, slideNum) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "text/xml");
    
    // Extract text nodes <a:t>
    const textNodes = xmlDoc.getElementsByTagName("a:t");
    let textParagraphs = [];

    for (let node of textNodes) {
      const content = node.textContent.trim();
      if (content) {
        textParagraphs.push(content);
      }
    }

    const slideDiv = document.createElement("div");
    slideDiv.className = "slide-content";

    if (textParagraphs.length > 0) {
      const title = textParagraphs[0];
      const bodyText = textParagraphs.slice(1);

      let html = `<h2>${title}</h2>`;
      if (bodyText.length > 0) {
        html += `<ul>`;
        bodyText.forEach((item) => {
          html += `<li>${item}</li>`;
        });
        html += `</ul>`;
      }
      slideDiv.innerHTML = html;
    } else {
      slideDiv.innerHTML = `<h2>Slide ${slideNum}</h2><p><i>(No text content found on this slide)</i></p>`;
    }

    return slideDiv;
  }

  function renderSlides() {
    slideStage.innerHTML = "";
    slides.forEach((slideEl) => slideStage.appendChild(slideEl));
  }

  function showSlide(index) {
    const allSlideEls = slideStage.querySelectorAll(".slide-content");
    allSlideEls.forEach((slide, idx) => {
      if (idx === index) {
        slide.classList.add("active-slide");
      } else {
        slide.classList.remove("active-slide");
      }
    });

    currentSlideIndex = index;
    updateControls();
  }

  function updateControls() {
    currentSlideEl.textContent = slides.length > 0 ? currentSlideIndex + 1 : 0;
    totalSlidesEl.textContent = slides.length;

    prevBtn.disabled = currentSlideIndex <= 0;
    nextBtn.disabled = currentSlideIndex >= slides.length - 1 || slides.length === 0;
  }

  // Navigation Button Handlers
  prevBtn.addEventListener("click", () => {
    if (currentSlideIndex > 0) showSlide(currentSlideIndex - 1);
  });

  nextBtn.addEventListener("click", () => {
    if (currentSlideIndex < slides.length - 1) showSlide(currentSlideIndex + 1);
  });

  // Keyboard Arrow Key Navigation
  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      prevBtn.click();
    } else if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") {
      nextBtn.click();
    }
  });

  function showError(msg) {
    slideStage.innerHTML = `<div class="status-msg" style="color: #ef4444;"><p>${msg}</p></div>`;
    slides = [];
    updateControls();
  }
});
