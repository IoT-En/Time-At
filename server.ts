import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import { runAutomation } from './garoon-runner';

const app = express();
app.use(bodyParser.json());
app.use(express.static(__dirname));

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


app.listen(3000, () => {
  console.log('UI running at http://localhost:3000/ui.html');
});
