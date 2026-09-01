"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var stockValidator_1 = require("./src/validators/stockValidator");
try {
    var result = stockValidator_1.movimientosQuerySchema.parse({
        componenteId: '',
        tipo: '',
        page: '1'
    });
    console.log('SUCCESS:', result);
}
catch (err) {
    console.log('ERROR:', err.errors || err);
}
