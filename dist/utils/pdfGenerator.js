"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePdfFromHtml = generatePdfFromHtml;
const puppeteer_1 = __importDefault(require("puppeteer"));
function generatePdfFromHtml(htmlContent) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('[PDF Generator] Iniciando geração de PDF...');
        const browser = yield puppeteer_1.default.launch({
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
        const page = yield browser.newPage();
        try {
            console.log('[PDF Generator] Carregando HTML...');
            yield page.setContent(htmlContent, {
                waitUntil: 'networkidle2',
                timeout: 60000
            });
            console.log('[PDF Generator] HTML carregado com sucesso');
        }
        catch (timeoutError) {
            console.warn('⚠️ [PDF Generator] Timeout ao carregar recursos externos');
            console.warn('⚠️ [PDF Generator] Tentando fallback com domcontentloaded...');
            try {
                yield page.setContent(htmlContent, {
                    waitUntil: 'domcontentloaded',
                    timeout: 10000
                });
                console.log('[PDF Generator] Aguardando 3s para recursos carregarem...');
                yield new Promise(resolve => setTimeout(resolve, 3000));
                console.log('[PDF Generator] Fallback concluído');
            }
            catch (fallbackError) {
                console.error('❌ [PDF Generator] Fallback também falhou:', fallbackError);
                yield browser.close();
                throw new Error('Não foi possível carregar o HTML para gerar o PDF');
            }
        }
        console.log('[PDF Generator] Gerando PDF...');
        const pdfBuffer = yield page.pdf({
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
        yield browser.close();
        console.log('[PDF Generator] ✅ PDF gerado com sucesso');
        return Buffer.from(pdfBuffer);
    });
}
