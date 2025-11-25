/**
 * @fileoverview
 * Tools especializadas para o chatbot jurídico
 * Cada tool realiza uma busca específica no Qdrant e retorna dados estruturados
 */

import { QdrantVectorStore } from "@langchain/qdrant";
import { traceable } from "langsmith/traceable";
import { qdrantClient, openAiEmbbeding } from "../../config";

const QDRANT_JURIDICO_COLLECTION_NAME = 'credify_juridico_collection';

const vectorStore = new QdrantVectorStore(openAiEmbbeding, {
    client: qdrantClient,
    collectionName: QDRANT_JURIDICO_COLLECTION_NAME,
});

// ============================================
// HELPER: Converter objeto REGISTRO para array
// ============================================
const registroObjectToArray = (obj: any): any[] => {
    if (!obj || typeof obj !== 'object') return [];
    
    return Object.keys(obj)
        .filter(key => key.startsWith('REGISTRO'))
        .sort((a, b) => {
            const numA = parseInt(a.replace('REGISTRO', ''));
            const numB = parseInt(b.replace('REGISTRO', ''));
            return numA - numB;
        })
        .map(key => obj[key]);
};

// ============================================
// TOOL 1: Buscar processos por parte
// ============================================
export const searchProcessesByParty = traceable(
    async function searchProcessesByParty(input: {
        partyName: string;
        filters?: { tribunal?: string; area?: string; status?: string };
    }) {
        console.log("🔍 [Tool] Buscando processos por parte:", input.partyName);

        try {
            const retriever = vectorStore.asRetriever({
                k: 50,
                filter: {
                    must: [
                        { key: "metadata.source", match: { value: "api_juridica" } }
                    ]
                }
            });

            const results = await retriever._getRelevantDocuments(
                `processos envolvendo ${input.partyName}`
            );

            const filtered = results.filter(doc => {
                const content = doc.pageContent.toLowerCase();
                const partyMatch = content.includes(input.partyName.toLowerCase());
                
                const tribunalMatch = !input.filters?.tribunal || 
                    doc.metadata.tribunal === input.filters.tribunal;
                const areaMatch = !input.filters?.area || 
                    doc.metadata.area === input.filters.area;
                const statusMatch = !input.filters?.status || 
                    content.includes(input.filters.status);

                return partyMatch && tribunalMatch && areaMatch && statusMatch;
            });

            console.log(`✅ [Tool] Encontrados ${filtered.length} processos para ${input.partyName}`);

            return filtered.map(doc => ({
                processNumber: doc.metadata.processNumber,
                area: doc.metadata.area,
                tribunal: doc.metadata.tribunal,
                value: doc.metadata.value,
                document: doc
            }));

        } catch (error: any) {
            console.error("❌ [Tool] Erro em searchProcessesByParty:", error.message);
            return [];
        }
    },
    { name: "Search Processes by Party", run_type: "tool" }
);

// ============================================
// TOOL 2: Detalhes completos do processo
// ============================================
export const getProcessDetails = traceable(
    async function getProcessDetails(input: {
        processNumber: string;
        includeDecisions?: boolean;
    }) {
        console.log("📋 [Tool] Buscando detalhes do processo:", input.processNumber);

        try {
            const retriever = vectorStore.asRetriever({
                k: 1,
                filter: {
                    must: [
                        { key: "metadata.processNumber", match: { value: input.processNumber } }
                    ]
                }
            });

            const results = await retriever._getRelevantDocuments(input.processNumber);

            if (results.length === 0) {
                console.log(`⚠️ [Tool] Processo ${input.processNumber} não encontrado`);
                return null;
            }

            const doc = results[0];

            return {
                processNumber: doc.metadata.processNumber,
                area: doc.metadata.area,
                tribunal: doc.metadata.tribunal,
                uf: doc.metadata.uf,
                value: doc.metadata.value,
                targetName: doc.metadata.targetName,
                targetDocument: doc.metadata.targetDocument,
                pageContent: doc.pageContent,
                document: doc
            };

        } catch (error: any) {
            console.error("❌ [Tool] Erro em getProcessDetails:", error.message);
            return null;
        }
    },
    { name: "Get Process Details", run_type: "tool" }
);

// ============================================
// TOOL 3: Buscar processos por área jurídica
// ============================================
export const searchProcessesByArea = traceable(
    async function searchProcessesByArea(input: {
        area: string;
        filters?: { tribunal?: string; status?: string; valueRange?: { min: number; max: number } };
    }) {
        console.log("⚖️ [Tool] Buscando processos na área:", input.area);

        try {
            const retriever = vectorStore.asRetriever({
                k: 100,
                filter: {
                    must: [
                        { key: "metadata.area", match: { value: input.area } }
                    ]
                }
            });

            const results = await retriever._getRelevantDocuments(`processos ${input.area}`);

            const filtered = results.filter(doc => {
                const tribunalMatch = !input.filters?.tribunal || 
                    doc.metadata.tribunal === input.filters.tribunal;
                
                const statusMatch = !input.filters?.status || 
                    doc.pageContent.includes(input.filters.status);
                
                const valueMatch = !input.filters?.valueRange || 
                    (doc.metadata.value >= input.filters.valueRange.min && 
                     doc.metadata.value <= input.filters.valueRange.max);

                return tribunalMatch && statusMatch && valueMatch;
            });

            const totalValue = filtered.reduce((sum, doc) => sum + (doc.metadata.value || 0), 0);

            console.log(`✅ [Tool] Encontrados ${filtered.length} processos na área ${input.area}`);

            return {
                area: input.area,
                totalCount: filtered.length,
                totalValue: totalValue,
                averageValue: filtered.length > 0 ? totalValue / filtered.length : 0,
                processes: filtered.map(doc => ({
                    processNumber: doc.metadata.processNumber,
                    tribunal: doc.metadata.tribunal,
                    value: doc.metadata.value,
                    document: doc
                }))
            };

        } catch (error: any) {
            console.error("❌ [Tool] Erro em searchProcessesByArea:", error.message);
            return { area: input.area, totalCount: 0, totalValue: 0, processes: [] };
        }
    },
    { name: "Search Processes by Area", run_type: "tool" }
);

// ============================================
// TOOL 4: Processos por tribunal
// ============================================
export const getProcessesByTribunal = traceable(
    async function getProcessesByTribunal(input: {
        tribunal: string;
        filters?: { area?: string; status?: string };
    }) {
        console.log("🏛️ [Tool] Buscando processos do tribunal:", input.tribunal);

        try {
            const retriever = vectorStore.asRetriever({
                k: 100,
                filter: {
                    must: [
                        { key: "metadata.tribunal", match: { value: input.tribunal } }
                    ]
                }
            });

            const results = await retriever._getRelevantDocuments(`processos ${input.tribunal}`);

            const filtered = results.filter(doc => {
                const areaMatch = !input.filters?.area || 
                    doc.metadata.area === input.filters.area;
                
                const statusMatch = !input.filters?.status || 
                    doc.pageContent.includes(input.filters.status);

                return areaMatch && statusMatch;
            });

            console.log(`✅ [Tool] Encontrados ${filtered.length} processos no ${input.tribunal}`);

            return {
                tribunal: input.tribunal,
                uf: filtered[0]?.metadata.uf || "N/A",
                totalCount: filtered.length,
                processes: filtered.map(doc => ({
                    processNumber: doc.metadata.processNumber,
                    area: doc.metadata.area,
                    value: doc.metadata.value,
                    document: doc
                }))
            };

        } catch (error: any) {
            console.error("❌ [Tool] Erro em getProcessesByTribunal:", error.message);
            return { tribunal: input.tribunal, totalCount: 0, processes: [] };
        }
    },
    { name: "Get Processes by Tribunal", run_type: "tool" }
);

// ============================================
// TOOL 5: Processos por status
// ============================================
export const getProcessesByStatus = traceable(
    async function getProcessesByStatus(input: {
        status: string;
        filters?: { area?: string; tribunal?: string; valueRange?: { min: number; max: number } };
    }) {
        console.log("📊 [Tool] Buscando processos com status:", input.status);

        try {
            const retriever = vectorStore.asRetriever({
                k: 100
            });

            const results = await retriever._getRelevantDocuments(`processos ${input.status}`);

            const filtered = results.filter(doc => {
                const statusMatch = doc.pageContent.includes(input.status);
                const areaMatch = !input.filters?.area || 
                    doc.metadata.area === input.filters.area;
                const tribunalMatch = !input.filters?.tribunal || 
                    doc.metadata.tribunal === input.filters.tribunal;
                const valueMatch = !input.filters?.valueRange || 
                    (doc.metadata.value >= input.filters.valueRange.min && 
                     doc.metadata.value <= input.filters.valueRange.max);

                return statusMatch && areaMatch && tribunalMatch && valueMatch;
            });

            console.log(`✅ [Tool] Encontrados ${filtered.length} processos com status ${input.status}`);

            return {
                status: input.status,
                totalCount: filtered.length,
                processes: filtered.map(doc => ({
                    processNumber: doc.metadata.processNumber,
                    area: doc.metadata.area,
                    tribunal: doc.metadata.tribunal,
                    value: doc.metadata.value,
                    document: doc
                }))
            };

        } catch (error: any) {
            console.error("❌ [Tool] Erro em getProcessesByStatus:", error.message);
            return { status: input.status, totalCount: 0, processes: [] };
        }
    },
    { name: "Get Processes by Status", run_type: "tool" }
);

// ============================================
// TOOL 6: Processos por faixa de valor
// ============================================
export const getProcessesByValueRange = traceable(
    async function getProcessesByValueRange(input: {
        minValue: number;
        maxValue: number;
        filters?: { area?: string; tribunal?: string; status?: string };
    }) {
        console.log("💰 [Tool] Buscando processos entre R$", input.minValue, "e R$", input.maxValue);

        try {
            const retriever = vectorStore.asRetriever({
                k: 100
            });

            const results = await retriever._getRelevantDocuments(
                `processos valor ${input.minValue} ${input.maxValue}`
            );

            const filtered = results.filter(doc => {
                const valueMatch = doc.metadata.value >= input.minValue && 
                                   doc.metadata.value <= input.maxValue;
                const areaMatch = !input.filters?.area || 
                    doc.metadata.area === input.filters.area;
                const tribunalMatch = !input.filters?.tribunal || 
                    doc.metadata.tribunal === input.filters.tribunal;
                const statusMatch = !input.filters?.status || 
                    doc.pageContent.includes(input.filters.status);

                return valueMatch && areaMatch && tribunalMatch && statusMatch;
            });

            const totalValue = filtered.reduce((sum, doc) => sum + (doc.metadata.value || 0), 0);

            console.log(`✅ [Tool] Encontrados ${filtered.length} processos na faixa de valor`);

            return {
                valueRange: { min: input.minValue, max: input.maxValue },
                totalCount: filtered.length,
                totalValue: totalValue,
                averageValue: filtered.length > 0 ? totalValue / filtered.length : 0,
                processes: filtered.map(doc => ({
                    processNumber: doc.metadata.processNumber,
                    area: doc.metadata.area,
                    tribunal: doc.metadata.tribunal,
                    value: doc.metadata.value,
                    document: doc
                }))
            };

        } catch (error: any) {
            console.error("❌ [Tool] Erro em getProcessesByValueRange:", error.message);
            return { valueRange: { min: input.minValue, max: input.maxValue }, totalCount: 0, processes: [] };
        }
    },
    { name: "Get Processes by Value Range", run_type: "tool" }
);

// ============================================
// TOOL 7: Processos por advogado
// ============================================
export const getProcessesWithAdvogado = traceable(
    async function getProcessesWithAdvogado(input: {
        advogadoName: string;
        filters?: { area?: string; tribunal?: string; status?: string };
    }) {
        console.log("👨‍⚖️ [Tool] Buscando processos do advogado:", input.advogadoName);

        try {
            const retriever = vectorStore.asRetriever({
                k: 100
            });

            const results = await retriever._getRelevantDocuments(
                `processos advogado ${input.advogadoName}`
            );

            const filtered = results.filter(doc => {
                const advogadoMatch = doc.pageContent.toLowerCase().includes(
                    input.advogadoName.toLowerCase()
                );
                const areaMatch = !input.filters?.area || 
                    doc.metadata.area === input.filters.area;
                const tribunalMatch = !input.filters?.tribunal || 
                    doc.metadata.tribunal === input.filters.tribunal;
                const statusMatch = !input.filters?.status || 
                    doc.pageContent.includes(input.filters.status);

                return advogadoMatch && areaMatch && tribunalMatch && statusMatch;
            });

            const totalValue = filtered.reduce((sum, doc) => sum + (doc.metadata.value || 0), 0);

            console.log(`✅ [Tool] Encontrados ${filtered.length} processos do advogado ${input.advogadoName}`);

            return {
                advogado: input.advogadoName,
                totalCount: filtered.length,
                totalValue: totalValue,
                processes: filtered.map(doc => ({
                    processNumber: doc.metadata.processNumber,
                    area: doc.metadata.area,
                    tribunal: doc.metadata.tribunal,
                    value: doc.metadata.value,
                    document: doc
                }))
            };

        } catch (error: any) {
            console.error("❌ [Tool] Erro em getProcessesWithAdvogado:", error.message);
            return { advogado: input.advogadoName, totalCount: 0, processes: [] };
        }
    },
    { name: "Get Processes with Advogado", run_type: "tool" }
);

// ============================================
// TOOL 8: Resumo estatístico
// ============================================
export const getProcessesSummary = traceable(
    async function getProcessesSummary(input: {
        filters?: { area?: string; tribunal?: string; status?: string };
    }) {
        console.log("📈 [Tool] Gerando resumo estatístico dos processos");

        try {
            const retriever = vectorStore.asRetriever({
                k: 1000
            });

            const results = await retriever._getRelevantDocuments("processos");

            const filtered = results.filter(doc => {
                const areaMatch = !input.filters?.area || 
                    doc.metadata.area === input.filters.area;
                const tribunalMatch = !input.filters?.tribunal || 
                    doc.metadata.tribunal === input.filters.tribunal;
                const statusMatch = !input.filters?.status || 
                    doc.pageContent.includes(input.filters.status);

                return areaMatch && tribunalMatch && statusMatch;
            });

            // Agregações
            const byArea: { [key: string]: { count: number; totalValue: number } } = {};
            const byTribunal: { [key: string]: { count: number; totalValue: number } } = {};
            const byStatus: { [key: string]: number } = {};
            const topParties: { [key: string]: number } = {};
            const topAdvogados: { [key: string]: number } = {};

            let totalValue = 0;

            filtered.forEach(doc => {
                const area = doc.metadata.area || "Desconhecido";
                const tribunal = doc.metadata.tribunal || "Desconhecido";
                const value = doc.metadata.value || 0;
                const content = doc.pageContent;

                // Por área
                if (!byArea[area]) byArea[area] = { count: 0, totalValue: 0 };
                byArea[area].count++;
                byArea[area].totalValue += value;

                // Por tribunal
                if (!byTribunal[tribunal]) byTribunal[tribunal] = { count: 0, totalValue: 0 };
                byTribunal[tribunal].count++;
                byTribunal[tribunal].totalValue += value;

                // Por status
                if (content.includes("EM TRAMITACAO")) {
                    byStatus["EM TRAMITACAO"] = (byStatus["EM TRAMITACAO"] || 0) + 1;
                } else if (content.includes("ENCERRADO")) {
                    byStatus["ENCERRADO"] = (byStatus["ENCERRADO"] || 0) + 1;
                }

                totalValue += value;
            });

            console.log(`✅ [Tool] Resumo gerado: ${filtered.length} processos`);

            return {
                totalProcesses: filtered.length,
                totalValue: totalValue,
                averageValue: filtered.length > 0 ? totalValue / filtered.length : 0,
                byArea: Object.entries(byArea).map(([area, data]) => ({
                    area,
                    count: data.count,
                    totalValue: data.totalValue
                })),
                byTribunal: Object.entries(byTribunal).map(([tribunal, data]) => ({
                    tribunal,
                    count: data.count,
                    totalValue: data.totalValue
                })),
                byStatus: Object.entries(byStatus).map(([status, count]) => ({
                    status,
                    count
                }))
            };

        } catch (error: any) {
            console.error("❌ [Tool] Erro em getProcessesSummary:", error.message);
            return {
                totalProcesses: 0,
                totalValue: 0,
                averageValue: 0,
                byArea: [],
                byTribunal: [],
                byStatus: []
            };
        }
    },
    { name: "Get Processes Summary", run_type: "tool" }
);

// ============================================
// TOOL 9: Buscar por tipo de decisão
// ============================================
export const searchProcessesByDecision = traceable(
    async function searchProcessesByDecision(input: {
        decisionType: string;
        filters?: { area?: string; tribunal?: string };
    }) {
        console.log("⚖️ [Tool] Buscando processos com decisão:", input.decisionType);

        try {
            const retriever = vectorStore.asRetriever({
                k: 100
            });

            const results = await retriever._getRelevantDocuments(
                `processos decisão ${input.decisionType}`
            );

            const filtered = results.filter(doc => {
                const decisionMatch = doc.pageContent.includes(input.decisionType);
                const areaMatch = !input.filters?.area || 
                    doc.metadata.area === input.filters.area;
                const tribunalMatch = !input.filters?.tribunal || 
                    doc.metadata.tribunal === input.filters.tribunal;

                return decisionMatch && areaMatch && tribunalMatch;
            });

            console.log(`✅ [Tool] Encontrados ${filtered.length} processos com decisão ${input.decisionType}`);

            return {
                decisionType: input.decisionType,
                totalCount: filtered.length,
                processes: filtered.map(doc => ({
                    processNumber: doc.metadata.processNumber,
                    area: doc.metadata.area,
                    tribunal: doc.metadata.tribunal,
                    value: doc.metadata.value,
                    document: doc
                }))
            };

        } catch (error: any) {
            console.error("❌ [Tool] Erro em searchProcessesByDecision:", error.message);
            return { decisionType: input.decisionType, totalCount: 0, processes: [] };
        }
    },
    { name: "Search Processes by Decision", run_type: "tool" }
);

// ============================================
// TOOL 10: Comparar processos
// ============================================
export const compareProcesses = traceable(
    async function compareProcesses(input: {
        processNumbers: string[];
    }) {
        console.log("🔄 [Tool] Comparando processos:", input.processNumbers);

        try {
            const retriever = vectorStore.asRetriever({
                k: 10
            });

            const allResults = [];
            for (const processNumber of input.processNumbers) {
                const results = await retriever._getRelevantDocuments(processNumber);
                allResults.push(...results);
            }

            const uniqueResults = Array.from(
                new Map(allResults.map(doc => [doc.metadata.processNumber, doc])).values()
            );

            // Encontrar partes e advogados em comum
            const allParties: { [key: string]: number } = {};
            const allAdvogados: { [key: string]: number } = {};

            uniqueResults.forEach(doc => {
                const content = doc.pageContent.toLowerCase();
                // Análise simplificada (em produção seria mais sofisticada)
            });

            console.log(`✅ [Tool] Comparação de ${uniqueResults.length} processos concluída`);

            return {
                processCount: uniqueResults.length,
                processes: uniqueResults.map(doc => ({
                    processNumber: doc.metadata.processNumber,
                    area: doc.metadata.area,
                    tribunal: doc.metadata.tribunal,
                    value: doc.metadata.value,
                    document: doc
                })),
                comparison: {
                    totalValue: uniqueResults.reduce((sum, doc) => sum + (doc.metadata.value || 0), 0),
                    averageValue: uniqueResults.length > 0 
                        ? uniqueResults.reduce((sum, doc) => sum + (doc.metadata.value || 0), 0) / uniqueResults.length
                        : 0
                }
            };

        } catch (error: any) {
            console.error("❌ [Tool] Erro em compareProcesses:", error.message);
            return { processCount: 0, processes: [], comparison: {} };
        }
    },
    { name: "Compare Processes", run_type: "tool" }
);
