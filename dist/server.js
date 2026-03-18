"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const garoon_runner_1 = require("./garoon-runner");
const app = (0, express_1.default)();
app.use(body_parser_1.default.json());
app.use(express_1.default.static(__dirname));
app.post('/run', async (req, res) => {
    try {
        const { user, pass, ics, startDate, endDate } = req.body;
        const result = await (0, garoon_runner_1.runAutomation)({
            username: user,
            password: pass,
            icsPath: ics,
            startDate,
            endDate,
        });
        res.json(result);
    }
    catch (e) {
        res.status(500).send(e.message);
    }
});
app.listen(3000, () => {
    console.log('UI running at http://localhost:3000/ui.html');
});
