import puppeteer from 'puppeteer';


export async function generatePdfFromHtml(htmlContent: string): Promise<Buffer> {
    
    console.log('[PDF Generator] Iniciando geração de PDF...');
    
    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',  
            '--disable-gpu',             
            '--disable-web-security',    
            '--disable-features=IsolateOrigins,site-per-process'  
        ]
    });
    
    const page = await browser.newPage();
    
    try {
        console.log('[PDF Generator] Carregando HTML...');
        
        
        await page.setContent(htmlContent, {
            waitUntil: 'networkidle2',  
            timeout: 60000               
        });
        
        console.log('[PDF Generator] HTML carregado com sucesso');
        
    } catch (timeoutError) {
        console.warn('⚠️ [PDF Generator] Timeout ao carregar recursos externos');
        console.warn('⚠️ [PDF Generator] Tentando fallback com domcontentloaded...');
        
        try {
            
            await page.setContent(htmlContent, {
                waitUntil: 'domcontentloaded',  
                timeout: 10000                   
            });
            
            
            console.log('[PDF Generator] Aguardando 3s para recursos carregarem...');
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            console.log('[PDF Generator] Fallback concluído');
            
        } catch (fallbackError) {
            console.error('❌ [PDF Generator] Fallback também falhou:', fallbackError);
            await browser.close();
            throw new Error('Não foi possível carregar o HTML para gerar o PDF');
        }
    }
    
    console.log('[PDF Generator] Gerando PDF...');
    
    const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
            top: '20px',
            right: '20px',
            bottom: '20px',
            left: '20px'
        },
        preferCSSPageSize: false  
    });
    
    await browser.close();
    
    console.log('[PDF Generator] ✅ PDF gerado com sucesso');
    
    return Buffer.from(pdfBuffer);
}
