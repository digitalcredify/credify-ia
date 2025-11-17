import { retrieverSessionHistory } from "../memory";
import { OPENAI_MODEL, openAIClient } from "../config";
import { generatePdfFromHtml } from "../utils/pdfGenerator";

export async function runPdfAgent(sessionId: string, userInput: string) {
    
    try {
        console.log("[PDF Agent] MongoDB pronto para uso.");
        
        const sessionHistory = await retrieverSessionHistory(sessionId);
        
        const lastReport = findLastReport(sessionHistory);
        
        if (!lastReport) {
            return {
                error: true,
                message: "Não encontrei nenhum relatório anterior."
            };
        }
        
        console.log("[PDF Agent] Relatório encontrado, gerando HTML...");
        const htmlContent = await generateHtmlFromReport(lastReport.content);
        
        console.log("[PDF Agent] HTML gerado, convertendo para PDF...");
        const pdfBuffer = await generatePdfFromHtml(htmlContent);
        
        return {
            success: true,
            base64: pdfBuffer.toString('base64'),
            filename: `relatorio-credify`,
            mimeType: "application/pdf"
        };
        
    } catch (error) {
        console.error("[PDF Agent] Erro:", error);
        return {
            error: true,
            message: "Erro ao gerar PDF: " + (error as Error).message
        };
    }
    
}

function findLastReport(history: any[]): { role: string, content: string } | null {
    
    console.log(`[PDF Agent] Analisando ${history.length} mensagens no histórico`);
    
    let bestCandidate: { msg: any, score: number, index: number } | null = null;
    
    for (let i = history.length - 1; i >= 0; i--) {
        const msg = history[i];
        
        if (msg.role === "user") continue;
        
        if (msg.content.length < 300) continue;
        
        let score = 0;
        
        if (msg.content.length > 500) score += 2;
        if (msg.content.length > 1000) score += 2;
        if (msg.content.length > 2000) score += 3;
        
        const headerCount = (msg.content.match(/^#{1,3}\s/gm) || []).length;
        score += Math.min(headerCount * 2, 10);
        
        const tableRows = (msg.content.match(/\|.*\|/g) || []).length;
        if (tableRows > 3) score += 5;
        if (tableRows > 10) score += 5;
        
        const monetaryCount = (msg.content.match(/R\$\s*[\d.,]+/g) || []).length;
        score += Math.min(monetaryCount, 10);
        
        const percentageCount = (msg.content.match(/\d+[.,]\d+\s*%/g) || []).length;
        score += Math.min(percentageCount, 5);
        
        const keywords = [
            'relatório', 'análise', 'resumo', 'total', 'receita', 'custo',
            'lucro', 'desempenho', 'resultado', 'métrica', 'indicador',
            'comparação', 'ranking', 'top', 'empresa', 'cliente'
        ];
        
        for (const keyword of keywords) {
            if (new RegExp(keyword, 'i').test(msg.content)) {
                score += 1;
            }
        }
        
        const listItems = (msg.content.match(/^[-*]\s/gm) || []).length;
        if (listItems > 3) score += 3;
        
      
        const positionFromEnd = history.length - 1 - i;
        
        if (positionFromEnd === 0) score += 100;      
        else if (positionFromEnd === 1) score += 50;  
        else if (positionFromEnd === 2) score += 25;  
        else if (positionFromEnd <= 5) score += 10;   
        
        console.log(`[PDF Agent] Mensagem ${i} (pos ${positionFromEnd}): ${score} pontos (${msg.content.length} chars)`);
        
        if (!bestCandidate || score > bestCandidate.score) {
            bestCandidate = { msg, score, index: i };
        }
    }
    
    if (bestCandidate && bestCandidate.score >= 10) {
        console.log(`[PDF Agent] Relatório encontrado na posição ${bestCandidate.index} com ${bestCandidate.score} pontos`);
        return bestCandidate.msg;
    }
    
    console.log(`[PDF Agent] Nenhum relatório encontrado no histórico`);
    return null;
}


async function generateHtmlFromReport(reportMarkdown: string) {

    const systemPrompt = `
    Você é um designer de documentos especializado em converter relatórios Markdown em HTML profissional.
    
    **TAREFA:**
    Converta o relatório Markdown abaixo em HTML completo, aplicando a identidade visual da Credify.
                
    **IDENTIDADE VISUAL DA CREDIFY:**
    - Cor Primária: #a91016 (Vermelho escuro)
    - Cor Secundária: #e51127 (Vermelho vibrante)
    - Cor de Destaque: #e51127 (Vermelho vibrante)
    - Cor de Fundo: #F9FAFB (Cinza claro)
    - Fonte: Arial, Helvetica, sans-serif (fontes do sistema)
    
    **ESTRUTURA OBRIGATÓRIA:**
    
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            
            body {
                font-family: Arial, Helvetica, sans-serif;
                background: #F9FAFB;
                padding: 40px;
                color: #1F2937;
            }
            
            .header {
                background: linear-gradient(135deg, #a91016 0%, #e51127 100%);
                padding: 40px;
                border-radius: 12px;
                margin-bottom: 30px;
                color: white;
                text-align: center;
            }
            
            .logo-text {
                font-size: 36px;
                font-weight: 700;
                letter-spacing: 2px;
                margin-bottom: 15px;
            }
            
            .report-title {
                font-size: 24px;
                font-weight: 600;
                margin-bottom: 10px;
                opacity: 0.95;
            }
            
            .report-date {
                opacity: 0.9;
                font-size: 14px;
            }
            
            .content {
                background: white;
                padding: 40px;
                border-radius: 12px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            
            h2 {
                color: #a91016;
                font-size: 24px;
                margin-top: 30px;
                margin-bottom: 15px;
                border-bottom: 3px solid #e51127;
                padding-bottom: 10px;
            }
            
            h3 {
                color: #e51127;
                font-size: 18px;
                margin-top: 20px;
                margin-bottom: 10px;
                padding-left: 10px;
                border-left: 4px solid #e51127;
            }
            
            p {
                margin-bottom: 12px;
                line-height: 1.6;
            }
            
            strong {
                color: #e51127;
                font-weight: 600;
            }
            
            table {
                width: 100%;
                border-collapse: collapse;
                margin: 20px 0;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            
            thead {
                background: linear-gradient(135deg, #a91016 0%, #e51127 100%);
            }
            
            th {
                color: white;
                padding: 12px 15px;
                text-align: left;
                font-weight: 600;
                text-transform: uppercase;
                font-size: 11px;
                letter-spacing: 0.5px;
            }
            
            td {
                padding: 12px 15px;
                border-bottom: 1px solid #E5E7EB;
            }
            
            tr:nth-child(even) {
                background: #F9FAFB;
            }
            
            tbody tr:hover {
                background: #fee;
            }
            
            ul, ol {
                margin-left: 25px;
                margin-bottom: 15px;
            }
            
            li {
                margin-bottom: 6px;
                line-height: 1.5;
            }
            
            ul li::marker {
                color: #e51127;
            }
            
            hr {
                border: none;
                border-top: 2px solid #E5E7EB;
                margin: 30px 0;
            }
            
            .footer {
                margin-top: 40px;
                padding-top: 20px;
                border-top: 2px solid #E5E7EB;
                text-align: center;
                color: #6B7280;
                font-size: 12px;
            }
            
            .footer-logo {
                font-size: 16px;
                font-weight: 700;
                color: #a91016;
                margin-top: 10px;
                letter-spacing: 1px;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="logo-text">CREDIFY</div>
            <div class="report-title">Relatório Financeiro</div>
            <div class="report-date">Gerado em ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
        
        <div class="content">
            <!-- CONTEÚDO DO RELATÓRIO AQUI -->
            <!-- Converta o Markdown para HTML aqui -->
        </div>
        
        <div class="footer">
            <p><strong>Credify</strong> | Análise Financeira Inteligente</p>
            <p>Documento gerado automaticamente pelo sistema de IA</p>
            <p>${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })} • ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
            <div class="footer-logo">CREDIFY</div>
        </div>
    </body>
    </html>
    
    **REGRAS DE CONVERSÃO:**
    1. Converta títulos Markdown (##) para <h2>, (###) para <h3>
    2. Converta tabelas Markdown para <table> HTML com <thead> e <tbody>
    3. Valores monetários (R$ X.XXX,XX) devem usar <strong> para destaque em vermelho
    4. Percentuais importantes devem usar <strong>
    5. Métricas destacadas podem usar destaque visual apropriado
    6. Mantenha a formatação e estrutura do relatório original
    7. Converta listas Markdown (-, *) para <ul><li>
    8. Converta **negrito** para <strong>
    9. Converta separadores (---) para <hr>
    10. NÃO adicione informações que não estão no relatório original
    11. Retorne APENAS o HTML completo, sem explicações ou código markdown
    12. NÃO use @import, Google Fonts ou imagens externas
    13. Use APENAS fontes do sistema (Arial, Helvetica, sans-serif)
    
    **EXEMPLO DE CONVERSÃO:**
    
    Markdown:
    ## 📊 Relatório Financeiro: iFood
    
    ### 📈 Métricas Principais
    
    | Métrica | Valor |
    |---------|-------|
    | Volume | 4.708 |
    | Receita | R$ 4.324,14 |
    
    HTML:
    <h2>📊 Relatório Financeiro: iFood</h2>
    <h3>📈 Métricas Principais</h3>
    <table>
        <thead>
            <tr>
                <th>Métrica</th>
                <th>Valor</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>Volume</td>
                <td>4.708</td>
            </tr>
            <tr>
                <td>Receita</td>
                <td><strong>R$ 4.324,14</strong></td>
            </tr>
        </tbody>
    </table>
    
    **RELATÓRIO MARKDOWN:**
    ${reportMarkdown}
    `;

    const response = await openAIClient.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: "Gere o HTML completo do relatório seguindo exatamente a estrutura fornecida." }
        ],
    });

    return response.choices[0].message.content || "";
}
