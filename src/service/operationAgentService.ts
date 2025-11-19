/**
 * @fileoverview 
 * este arquivo atua como um roteador inteligente, ele decide qual agente especealizado utilizar.
 * Web Agent: acionado quando é feita perguntas sobre dados.
 * PDF Agent: acionado quando o usuário pede explicitamente por um pdf.
*/

import { runOperationsChatBotAgent } from "../agents/operations/operationsChatBotAgent"
import { runRouterAgent } from "../agents/routerAgent"


export const operationAgentService = async(
    pergunta:string,
    json:any,
    startDate:any,
    endDate:any,
    startHour:any, 
    endHour:any,
    onChunk?: (chunk: string) => void  



) => {

    const routeDecison = await runRouterAgent(pergunta)

    switch(routeDecison.routerName){

        case 'web_agent':

        return await runOperationsChatBotAgent(pergunta,json,startDate,endDate,startHour,endHour,onChunk)

    }

}


