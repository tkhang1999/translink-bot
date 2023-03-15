import { Context, Markup, Telegraf } from "telegraf";
import { Location, Update } from "typegram";
import { message } from "telegraf/filters";
import dotenv from "dotenv";
import { getBusArrivalTime, getNearby, NearbyResponse } from "./schedules";

dotenv.config();

const bot: Telegraf<Context<Update>> = new Telegraf(
  process.env.BOT_TOKEN as string
);

bot.start((ctx) => {
  const message: string = `Welcome! Please use the command /nearby to find nearby bus stops and schedules.\n
Or reply with the below format to query bus arrival time:
"<bus_id> <bus_stop_id>" (e.g. "145 59314")`;
  ctx.reply(message);
});

bot.command("nearby", async (ctx) => {
  return ctx.reply(
    "Please share your location",
    Markup.keyboard([Markup.button.locationRequest("Send location")])
      .resize(true)
      .oneTime(true)
  );
});

bot.on(message("location"), async (ctx) => {
  const location: Location.CommonLocation = ctx.message.location;
  const nearbyResponse: NearbyResponse = await getNearby(location);

  ctx.reply(
    nearbyResponse.message,
    Markup.keyboard(nearbyResponse.options).resize(true).oneTime(false)
  );
});

bot.on(message("text"), async (ctx) => {
  const input: string[] = (ctx.message.text || "").split(" ");

  return ctx.reply(await getBusArrivalTime(input));
});

bot.launch();
