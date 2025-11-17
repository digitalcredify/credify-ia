import { checkIfDataExists, ingestData } from "../scripts/ingest-data";
import { generateResponse } from "../planning";
import { isCurrentMonth } from "../utils/dateUtils";  


export const runWebAgent = async (
    pergunta: string, 
    jsonData: any, 
    targetMonth: string,
    onChunk?: (chunk: string) => void  
) => {
    
    try {
        // Não é mais necessário conectar ao MongoDB, o Qdrant é gerenciado automaticamente
        console.log("[Web Agent] Iniciando processamento com Qdrant...");
        
        const isCurrentMonthFlag = isCurrentMonth(targetMonth);
        
        if (isCurrentMonthFlag) {
            console.log(`[Web Agent] ⚠️ Mês atual detectado (${targetMonth})`);
            console.log(`[Web Agent] 🔄 Reingerindo dados (dados dinâmicos)...`);
            
            await ingestData(jsonData, targetMonth);
            // createVectorIndex não é mais necessário, o QdrantVectorStore cria a coleção automaticamente
            
            console.log(`[Web Agent] ✅ Reingestão concluída`);
            
        } else {
            const dataExists = await checkIfDataExists(targetMonth);
            
            if (!dataExists) {
                console.log(`[Web Agent] Iniciando ingestão para ${targetMonth}...`);
                await ingestData(jsonData, targetMonth);
            } else {
                console.log(`[Web Agent] Dados para ${targetMonth} já existem.`);
            }
        }

        // Gera a resposta usando os dados do Qdrant
        const response = await generateResponse(targetMonth, pergunta, onChunk);
        return response;

    } catch (error) {
        console.error("[Web Agent] Erro fatal:", error);
        return "Desculpe, ocorreu um erro.";
    }
}
