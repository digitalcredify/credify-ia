import puppeteer from 'puppeteer';

export async function generatePdfFromHtml(htmlContent: string): Promise<Buffer> {
    
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Define o conteúdo HTML
    await page.setContent(htmlContent, {
        waitUntil: 'networkidle0'
    });
    
    // Gera o PDF
    const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
            top: '20px',
            right: '20px',
            bottom: '20px',
            left: '20px'
        }
    });
    
    await browser.close();
    
    return Buffer.from(pdfBuffer);
}