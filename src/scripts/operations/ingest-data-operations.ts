import { QdrantVectorStore } from "@langchain/qdrant"
import { Document } from "langchain"
import { openAiEmbbeding, qdrantClient } from "../../config"

async function ensureCollectionExists() {
    try {

        await qdrantClient.getCollection("dashboard-operacoes")


        
    } catch (error:any) {

            
            await qdrantClient.createCollection("dashboard-operacoes",{
                vectors:{
                    size:1536,
                    distance:"Cosine"
                }
            })

            await qdrantClient.createPayloadIndex("dashboard-operacoes",{
                field_name: "timestamp",
                field_schema: "keyword"
            })

            await qdrantClient.createPayloadIndex("dashboard-operacoes",{
                field_name: "source_endpoint",
                field_schema: "keyword"
            })
       
        
    }
}

function formatMonetaryValue(cents: number): number {
    return cents / 10000
}

const mockCompanyXUsersData = [
    {
        "company": { "id": 37361, "name": "SEM PARAR", "companyName": "SEM PARAR", "type": "master" },
        "users": [
            { "id": 38057, "login": "38057", "accountName": "SEM PARAR", "total": 87845, "successes": 87796, "fails": 49, "averageExecutionTime": 693.02, "simulatedMonetaryValue": 878450000 }
        ],
        "totals": { "total": 87845, "successes": 87796, "fails": 49, "averageExecutionTime": 693.02, "simulatedMonetaryValue": 878450000 }
    },
];

const mockProductsTableData = [
    {
        "product_id": 330,
        "product_name": "VeicularBNacional",
        "total": 18184,
        "successes": 18100,
        "fails": 84,
        "averageExecutionTime": 550.25,
        "simulatedMonetaryValue": 181840000 // R$ 18184.0000
    },
    {
        "product_id": 401,
        "product_name": "ResidencialBPlus",
        "total": 5120,
        "successes": 5000,
        "fails": 120,
        "averageExecutionTime": 810.15,
        "simulatedMonetaryValue": 51200000 // R$ 5120.0000
    },
];

const mockByDayChartData = [
    {
        "date": "2025-11-17",
        "total": 105029,
        "successes": 104896,
        "fails": 133,
        "averageExecutionTime": 710.50,
        "simulatedMonetaryValue": 1050290000 // R$ 105029.0000
    },
    {
        "date": "2025-11-16",
        "total": 98765,
        "successes": 98700,
        "fails": 65,
        "averageExecutionTime": 680.90,
        "simulatedMonetaryValue": 987650000 // R$ 98765.0000
    },
];

const mockByHourData = [
    {
        "hour": 14,
        "total": 5000,
        "successes": 4900,
        "fails": 100,
        "averageExecutionTime": 650.00,
        "simulatedMonetaryValue": 12345678 // R$ 1234.5678
    },
    {
        "hour": 15,
        "total": 6000,
        "successes": 5950,
        "fails": 50,
        "averageExecutionTime": 700.00,
        "simulatedMonetaryValue": 23456789 // R$ 2345.6789
    },
];

const mockByUserData = [
    {
        "user_id": 101,
        "user_login": "joao.silva",
        "total": 1500,
        "successes": 1450,
        "fails": 50,
        "averageExecutionTime": 500.00,
        "simulatedMonetaryValue": 5000000 // R$ 500.0000
    },
    {
        "user_id": 102,
        "user_login": "maria.souza",
        "total": 2000,
        "successes": 1980,
        "fails": 20,
        "averageExecutionTime": 450.00,
        "simulatedMonetaryValue": 7500000 // R$ 750.0000
    },
];

const mockByOriginTableData = [
    {
        "application_id": "WEB",
        "application_name": "Portal Web",
        "total": 10000,
        "successes": 9900,
        "fails": 100,
        "averageExecutionTime": 300.00,
        "simulatedMonetaryValue": 10000000 // R$ 1000.0000
    },
    {
        "application_id": "API",
        "application_name": "API Externa",
        "total": 5000,
        "successes": 4800,
        "fails": 200,
        "averageExecutionTime": 800.00,
        "simulatedMonetaryValue": 5000000 // R$ 500.0000
    },
];


 // --- FUNÇÕES DE TRANSFORMAÇÃO ---

// documento das impresas e usuarios
function transformCompanyXUsers(data: any[]): Document[] {

    const documents: Document[] = []

   

   
    data.forEach(companyData => {

        const companyName = companyData.company.name || 'Não mencionado'
        const timestamp = new Date().toISOString()

        const companyDoc = new Document({
            pageContent:`
                Desempenho agregado da EMPRESA ${companyName}.
                Total de requisições: ${companyData.totals.total}.
                Sucessos: ${companyData.totals.successes}.
                Falhas:${companyData.totals.fails}.
                Tempo médio de execução: ${companyData.totals.averageExecutionTime}ms.
                Valor monetário: R$ ${formatMonetaryValue(companyData.totals.simulatedMonetaryValue)}.
            `.trim(),

            metadata: {
                source_endpoint: 'CompanyXUsersTable',
                entity_type: 'Company',
                company_id: companyData.company.id,
                company_name: companyName,
                timestamp: timestamp,
                raw_data: companyData.totals,

            }
        })

        documents.push(companyDoc)


        // Documentos dos usuários
        companyData.users.forEach((userData:any) => {

            const userDoc = new Document({
                pageContent: `
                    Desempenho do USUÁRIO ${userData.accountName || userData.login} (ID ${userData.id}) na empresa ${companyName}.

                    Total de requisições: ${userData.total}.
                    Sucessos: ${userData.successes}.
                    Falhas: ${userData.fails}.
                    Tempo médio de execução: ${userData.averageExecutionTime}ms.
                    Valor monetário: R$ ${formatMonetaryValue(userData.simulatedMonetaryValue)}.
            
                `.trim(),

                metadata:{
                    source_endpoint: "CompanyXusersTable",
                    entity_type: 'User',
                    company_id: companyData.company.id,
                    company_name: companyName,
                    user_id: userData.id,
                    user_login: userData.login,
                    timestamp:timestamp,
                    raw_data: userData
                }
            })
            documents.push(userDoc);

        })

    })

    return documents;

}

// documento dos produtos
function transformProductsTable(data: any[]): Document[] {

    const documents: Document[] = []

    data.forEach(productData => {

        const timestamp = new Date().toISOString()

        const productDoc = new Document({
            pageContent:`
                Desempenho do PRODUTO ${productData.product_name} (ID ${productData.product_id}).
                Total de requisições: ${productData.total}.
                Sucessos: ${productData.successes}.
                Falhas: ${productData.fails}.
                Tempo médio de execução: ${productData.averageExecutionTime}ms.
                Valor monetário: R$ ${formatMonetaryValue(productData.simulatedMonetaryValue)}.

            `.trim(),
            metadata: {
                source_endpoint: 'ProductsTable',
                entity_type: 'Product',
                product_id: productData.product_id,
                product_name: productData.product_name,
                timestamp: timestamp,
                raw_data: productData,

            }
        })
        documents.push(productDoc);

    })

    return documents


}

// documentos byDay
function transformByDayChart(data: any[]): Document[]{

    const documents: Document[] = []

    data.forEach(dayData => {

        const date = dayData.date;

        const timestamp = new Date(date + 'T00:00:00Z').toISOString(); 

        const dayDoc = new Document({
            pageContent:`
                Desempenho agregado no DIA ${date}.
                Total de requisições: ${dayData.success}.
                Sucessos: ${dayData.successes}.
                Falhas: ${dayData.fails}.
                Tempo médio de execução: ${dayData.averageExecutionTime}ms.
                Valor monetário (simulado): R$ ${formatMonetaryValue(dayData.simulatedMonetaryValue)}.

            `.trim(),

            metadata: {
                source_endpoint: 'ByDayChart',
                entity_type: 'DailySummary',
                date: date,
                timestamp: timestamp,
                raw_data: dayData,
            }
        })
        documents.push(dayDoc);

    })

    return documents;

}

// documentos byHour
function transformByHour(data: any[]): Document[] {
    const documents: Document[] = [];

    data.forEach(hourData => {
        const hour = hourData.hour;
        // Assumindo que o dado de hora é do dia atual ou de um dia específico
        const timestamp = new Date().toISOString().split('T')[0] + `T${String(hour).padStart(2, '0')}:00:00Z`;

        const hourDoc = new Document({
            pageContent: `
                Desempenho agregado na HORA ${hour} (das ${hour}:00 às ${hour}:59).
                Total de requisições: ${hourData.total}.
                Sucessos: ${hourData.successes}.
                Falhas: ${hourData.fails}.
                Tempo médio de execução: ${hourData.averageExecutionTime}ms.
                Valor monetário (simulado): R$ ${formatMonetaryValue(hourData.simulatedMonetaryValue)}.
            `.trim(),
            metadata: {
                source_endpoint: 'byHour',
                entity_type: 'HourlySummary',
                hour: hour,
                timestamp: timestamp,
                raw_data: hourData,
            }
        });
        documents.push(hourDoc);
    });

    return documents;
}

// documentos usuarios
function transformByUser(data: any[]): Document[] {

    const documents: Document[] = [];

    data.forEach(userData => {

        const timestamp = new Date().toISOString();

        const userDoc = new Document({
            pageContent: `
                Desempenho do USUÁRIO ${userData.user_login} (ID ${userData.user_id}).
                Total de requisições: ${userData.total}.
                Sucessos: ${userData.successes}.
                Falhas: ${userData.fails}.
                Tempo médio de execução: ${userData.averageExecutionTime}ms.
                Valor monetário (simulado): R$ ${formatMonetaryValue(userData.simulatedMonetaryValue)}.
            `.trim(),
            metadata: {
                source_endpoint: 'byuser',
                entity_type: 'UserSummary',
                user_id: userData.user_id,
                user_login: userData.user_login,
                timestamp: timestamp,
                raw_data: userData,
            }
        })
        documents.push(userDoc);
    })
    return documents;


}

function transformByOriginTable(data: any[]): Document[] {
    const documents: Document[] = [];

    data.forEach(originData => {
        const timestamp = new Date().toISOString();

        const originDoc = new Document({
            pageContent: `
                Desempenho da ORIGEM/APLICAÇÃO ${originData.application_name} (ID ${originData.application_id}).
                Total de requisições: ${originData.total}.
                Sucessos: ${originData.successes}.
                Falhas: ${originData.fails}.
                Tempo médio de execução: ${originData.averageExecutionTime}ms.
                Valor monetário (simulado): R$ ${formatMonetaryValue(originData.simulatedMonetaryValue)}.
            `.trim(),
            metadata: {
                source_endpoint: 'byOriginTable',
                entity_type: 'OriginSummary',
                application_id: originData.application_id,
                application_name: originData.application_name,
                timestamp: timestamp,
                raw_data: originData,
            }
        });
        documents.push(originDoc);
    });

    return documents;
}


export async function ingestDataOperation() {
    
    await ensureCollectionExists()

    const allDocuments: Document[] = []

    allDocuments.push(...transformCompanyXUsers(mockCompanyXUsersData));
    allDocuments.push(...transformProductsTable(mockProductsTableData));
    allDocuments.push(...transformByDayChart(mockByDayChartData));
    allDocuments.push(...transformByHour(mockByHourData));
    allDocuments.push(...transformByUser(mockByUserData));
    allDocuments.push(...transformByOriginTable(mockByOriginTableData));

    if(allDocuments.length > 0){
        const vectorStore = new QdrantVectorStore(openAiEmbbeding, {
            client: qdrantClient,
            collectionName: "dashboard-operacoes",
        })

        await vectorStore.addDocuments(allDocuments)
    }
}
