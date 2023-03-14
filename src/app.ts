import { Context, Telegraf } from "telegraf";
import { Update } from "typegram";
import axios, { AxiosError } from "axios";
import { get } from "lodash";
import { message } from "telegraf/filters";
import dotenv from "dotenv";

dotenv.config();

const getBusArrivalTime = async (input: string[]): Promise<string> => {
  if (input.length !== 2) {
    return "Wrong input format! Please try again!";
  }

  const stopId: string = input[0];
  const busId: string = input[1];
  const url: string = `https://api.translink.ca/rttiapi/v1/stops/${stopId}/estimates?apikey=${process.env.TRANSLINK_API_KEY}&routeNo=${busId}`;
  try {
    const res: any = await axios({ method: "get", url });
    const schedules: any[] = get(get(res.data, 0), "Schedules", []);
    if (schedules.length === 0) {
      return "No schedule times available! Again one more time?";
    }

    let message: string = `Bus ${busId} at stop ${stopId}:\n`;
    schedules.forEach((schedule: any) => {
      const countdown: number = schedule["ExpectedCountdown"];
      if (countdown == 0) {
        message += `\nnow (${schedule["ExpectedLeaveTime"]})`;
      } else if (countdown < 0) {
        message += `\n${Math.abs(countdown)} mins ago (${
          schedule["ExpectedLeaveTime"]
        })`;
      } else {
        message += `\nin ${countdown} mins (${schedule["ExpectedLeaveTime"]})`;
      }
    });

    return message;
  } catch (error) {
    console.log(error);
    let message = "Something unexpectedly happened :(";
    if (axios.isAxiosError(error)) {
      const axiosError: AxiosError = error as AxiosError;
      message = get(axiosError.response?.data, 'Message', message);
    }
    return message;
  }
};

const bot: Telegraf<Context<Update>> = new Telegraf(
  process.env.BOT_TOKEN as string
);

bot.start((ctx) => {
  const message: string = `Welcome! Please follow the below format to query bus arrival time: \n
"<bus_stop_id> <bus_id>" (e.g. "59314 145")`;
  ctx.reply(message);
});

bot.on(message("text"), async (ctx) => {
  const input: string[] = (ctx.message.text || "").split(" ");

  return ctx.reply(await getBusArrivalTime(input));
});

bot.launch();
