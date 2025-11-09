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
Object.defineProperty(exports, "__esModule", { value: true });
exports.vectorSearchTool = vectorSearchTool;
exports.calculatorTool = calculatorTool;
const config_1 = require("./config");
const ingest_data_1 = require("./scripts/ingest-data");
const mathjs_1 = require("mathjs");
function vectorSearchTool(input) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("vector search input:", input);
        const queryEmbedding = yield (0, ingest_data_1.getEmbedding)(input.query);
        const pipeline = [
            {
                $vectorSearch: {
                    index: "vector_index",
                    queryVector: queryEmbedding,
                    path: "embedding",
                    // exact:true,
                    limit: 500,
                    numCandidates: 500,
                    filter: input.filters
                }
            },
            {
                $project: {
                    _id: 0,
                    // embedding: 0,
                    document: "$$ROOT",
                    score: { $meta: "vectorSearchScore" }
                }
            },
            {
                $unset: "document.embedding"
            }
        ];
        const cursor = config_1.vectorCollection.aggregate(pipeline);
        const results = yield cursor.toArray();
        return results.map(r => ({
            document: {
                pageContent: JSON.stringify(r.document)
            },
            score: r.score
        }));
    });
}
function calculatorTool(userInput) {
    try {
        const result = (0, mathjs_1.evaluate)(userInput);
        return String(result);
    }
    catch (error) {
        return `Error: ${error}`;
    }
}
