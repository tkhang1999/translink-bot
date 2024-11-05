import { Markup, Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import dotenv from "dotenv";
import { getBusArrivalTime } from "./arrival";
import { Location } from "telegraf/typings/core/types/typegram";
import { getNearby, NearbyResponse } from "./nearby";

dotenv.config();

const bot: Telegraf = new Telegraf(process.env.BOT_TOKEN as string);

bot.start((ctx) => {
  const message = `Welcome! Please reply with the below format to query bus arrival time:
"<bus_id> <bus_stop_id>" (e.g. "145 59314")`;
  ctx.reply(message);
});

bot.command("nearby", async (ctx) => {
  return ctx.reply(
    "Please share your location",
    Markup.keyboard([Markup.button.locationRequest("Send location")])
      .resize(true)
      .oneTime(true),
  );
});

bot.on(message("location"), async (ctx) => {
  const location: Location.CommonLocation = ctx.message.location;
  const nearbyResponse: NearbyResponse = await getNearby(location);

  ctx.reply(
    nearbyResponse.message,
    Markup.keyboard(nearbyResponse.options).resize(true).oneTime(false),
  );
});

bot.on(message("text"), async (ctx) => {
  const input: string[] = (ctx.message.text || "").split(" ");

  return ctx.reply(await getBusArrivalTime(input));
});

const webhookDomain: string | undefined = process.env.DOMAIN;
if (webhookDomain) {
  const port: number = parseInt(process.env.PORT || "");
  bot
    .launch({ webhook: { domain: webhookDomain, port: port } })
    .then(() => console.log("Webhook bot listening on port", port));
} else {
  console.log("Long-polling bot running");
  bot.launch();
}
