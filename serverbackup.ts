

import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import { runAutomation } from './garoon-runner';

const app = express();
app.use(bodyParser.json());
app.use(express.static(__dirname));
app.use(express.static('.'));

app.post('/run', async (req, res) => {
  try {
    const { user, pass, ics, startDate, endDate } = req.body;

    const result = await runAutomation({
      username: user,
      password: pass,
      icsPath: ics,
      startDate,
      endDate,
    });

    res.json(result);
  } catch (e: any) {
    res.status(500).send(e.message);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`UI running at http://localhost:${PORT}/ui.html`);
});
