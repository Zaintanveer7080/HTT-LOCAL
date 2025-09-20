import ReactDOM from 'react-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const generatePdf = (component, filename, toast) => {
  const viewport = document.getElementById('pdf-viewport');
  if (!viewport) {
    const msg = "PDF viewport not found. Make sure it's rendered in your App component.";
    console.error(msg);
    if(toast) toast({ title: "Error", description: msg, variant: "destructive" });
    return;
  }

  const pdfContainer = document.createElement('div');
  viewport.appendChild(pdfContainer);

  const renderPromise = new Promise(resolve => {
    ReactDOM.render(component, pdfContainer, () => resolve());
  });

  renderPromise.then(() => {
    setTimeout(() => {
      // Use the first child of the container, which is the rendered component
      const contentToCapture = pdfContainer.children[0];
      if (!contentToCapture) {
        if(toast) toast({ title: "Error", description: "PDF content not found for rendering.", variant: "destructive" });
        return;
      }
      html2canvas(contentToCapture, { 
        scale: 2,
        useCORS: true, 
        logging: true,
      }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const ratio = canvasWidth / canvasHeight;
        let width = pdfWidth;
        let height = width / ratio;
        
        // Handle content that is longer than one page
        if (height > pdfHeight) {
          let position = 0;
          let remainingHeight = canvasHeight;
          const pageCanvas = document.createElement('canvas');
          const pageCtx = pageCanvas.getContext('2d');
          pageCanvas.width = canvasWidth;
          pageCanvas.height = pdfHeight * (canvasWidth/pdfWidth);

          while (remainingHeight > 0) {
            pageCtx.clearRect(0, 0, pageCanvas.width, pageCanvas.height);
            pageCtx.drawImage(canvas, 0, position, canvasWidth, pageCanvas.height, 0, 0, pageCanvas.width, pageCanvas.height);
            const pageImgData = pageCanvas.toDataURL('image/png');
            pdf.addImage(pageImgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            
            remainingHeight -= pageCanvas.height;
            position += pageCanvas.height;

            if (remainingHeight > 0) {
              pdf.addPage();
            }
          }
        } else {
            pdf.addImage(imgData, 'PNG', 0, 0, width, height);
        }

        pdf.save(filename);

        ReactDOM.unmountComponentAtNode(pdfContainer);
        viewport.removeChild(pdfContainer);
        if(toast) toast({ title: "Success", description: `${filename} has been downloaded.`, variant: "success" });
      }).catch(error => {
          console.error("Error generating canvas for PDF:", error);
          if(toast) toast({ title: "Canvas Error", description: "Could not generate canvas for PDF.", variant: "destructive" });
      });
    }, 500); // Delay to ensure images are loaded
  });
};