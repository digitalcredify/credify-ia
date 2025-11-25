/**
 * @fileoverview
 * Serviço para o agente jurídico
 * Orquestra a execução do agente jurídico com validações
 */

import { runJuridicoAgent } from "../agents/juridicoAgent";

/**
 * Serviço principal do agente jurídico
 * @param pergunta - Pergunta do usuário sobre processos
 * @param onChunk - Callback opcional para streaming
 * @returns Resposta do agente
 */
const juridicoAgentService = async (
    pergunta: string,
    onChunk?: (chunk: string) => void
): Promise<string> => {
    try {
        console.log("[Juridico Service] Processando pergunta:", pergunta);

        // Validações básicas
        if (!pergunta || pergunta.trim().length === 0) {
            throw new Error("Pergunta não pode estar vazia");
        }

        // Executar o agente jurídico
        const response = await runJuridicoAgent(pergunta, onChunk);

        if (!response) {
            throw new Error("Nenhuma resposta foi gerada");
        }

        console.log("[Juridico Service] ✅ Serviço concluído com sucesso");

        return response;

    } catch (error) {
        console.error("[Juridico Service] ❌ Erro no serviço:", error);
        
        const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
        throw new Error(`Erro ao processar pergunta jurídica: ${errorMessage}`);
    }
};

export default juridicoAgentService;
