import { traceable } from "langsmith/traceable";
import { juridicoPartiesAnalysisTool, runJuridicoToolRoutingAgent } from "../../tools/juridico/Juridicotools";
import { content } from "pdfkit/js/page";
import { SystemMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { advancedModel, balancedModel, fastModel } from "../../config";


const selectAndExecuteTools = traceable(
    async function selectAndExecuteTools(
        pergunta:string,
        document:string,
        name:string): Promise<any[]> {

        console.log("[Juridico Planning] Selecionando ferramentas com agente inteligente...");

            const tool = await runJuridicoToolRoutingAgent(pergunta,document,name)

            const filters:any = {document, name}
            if(document !== undefined && name !== undefined){
                filters.document = document
                filters.name = name
            }
            const results: any[] = []

            if(tool.tool === 'partiesAnalysis'){
                console.log('[Juridico Planning] Usando PartiesAnalysis')

                const resultPartiesAnalysis = await juridicoPartiesAnalysisTool({
                    query:pergunta,
                    filters
                })

                results.push({
                    tool:tool.tool,
                    data:resultPartiesAnalysis
                })
            }

            console.log(`[Juridico Planning] ${results.length} ferramentas executadas`)

            return results
  
    }
)

async function generateResponseOpenAI(
    messages: any,
    modelType: "advanced" | "balanced" | "fast" = "advanced",
    onChunk?: (chunk: string) => void
): Promise<string> {
    try {
        const langchainMessages = messages.map((msg: any) => {
            if (msg.role === "system") return new SystemMessage(msg.content);
            if (msg.role === "user") return new HumanMessage(msg.content);
            if (msg.role === "assistant") return new AIMessage(msg.content);
            return new HumanMessage(msg.content);
        });

        let selectedModel;
        if (modelType === "advanced") {
            selectedModel = advancedModel;
        } else if (modelType === "balanced") {
            selectedModel = balancedModel;
        } else {
            selectedModel = fastModel;
        }

        if (onChunk) {
            const stream = await selectedModel.stream(langchainMessages);
            let fullResponse = "";

            for await (const chunk of stream) {
                const content = String(chunk.content || "");

                if (content) {
                    onChunk(content);
                }

                fullResponse += content;
            }

            return fullResponse;
        } else {
            const response = await selectedModel.invoke(langchainMessages);
            return String(response.content);
        }

    } catch (error) {
        console.error("Error in OpenAiChatCompletion:", error);
        throw error;
    }
}

export const generateJuridicoResponse = traceable(
    async function generateJuridicoResponse(
        pergunta:string,
        document:string,
        name:string,
        onChunk?: (chunk:string) => void
    ): Promise<string> {
        try {
            console.log("[Juridico Planning] Gerando resposta para pergunta jurídica...");

            const toolResults = await selectAndExecuteTools(pergunta,document,name);

            let context = `
                Documento analisado analisado: ${document}.
                Nome da empresa: ${name}.
            `
            if(document !== undefined && name !== undefined){
                context += ` (Nome:${name} (${document}))`
            }

            context += `\n\n`;

            for (const result of toolResults){


                if(result.tool === 'partiesAnalysis'){
                    context+= "Informações das partes:\n";
                    context += JSON.stringify(result.data, null,2) + "\n\n";
                }

            }

            const systemPrompt = `
            
            `

            const messages = [
                {role:"system", content:systemPrompt},
                {role: "user", content:pergunta}
            ]

            const response = await generateResponseOpenAI(messages, "advanced", onChunk)

            console.log("[Juridico Planning] Resposta gerada com sucesso")

            return response


        } catch (error) {
            console.error("[Juridico Planning] Erro ao gerar resposta:", error)
            throw error
        }
    },
    {name: "Gerando Resposta Juridica", run_type:"chain"}

)