import { EmbedBuilder, TextChannel } from "discord.js";
import axios from "axios";

import CoinModel from "../models/Coin";
import { Client } from "../structures/core/Bot";
import emojis from "../emojis.json";

export class ExchangeLoop {
  private client: Client | null = null;
  private isRunning = false;
  private coinIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor() {}

  async start(client: Client) {
    if (this.isRunning) return;

    this.client = client;
    this.isRunning = true;
    console.log("🔄 Exchange Loop started");

    const coins = await CoinModel.find();

    for (const coin of coins) {
      this.startCoinLoop(coin);
    }
  }

  stop() {
    this.coinIntervals.forEach((interval) => {
      clearTimeout(interval);
    });
    this.coinIntervals.clear();
    this.isRunning = false;
    console.log("⏹️ Exchange Loop stopped");
  }

  private startCoinLoop(coin: any) {
    const setRandomInterval = () => {
      // Random interval between 10-360 seconds (like AroxV2)
      const randomDelay = (Math.floor(Math.random() * (360 - 10 + 1)) + 10) * 1000;

      const timeout = setTimeout(async () => {
        await this.updateCoin(coin);
        setRandomInterval(); // Schedule next update
      }, randomDelay);

      this.coinIntervals.set(coin.id, timeout);
    };

    setRandomInterval();
  }

  private async updateCoin(coin: any) {
    try {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const currentTime = `${hours}:${minutes < 10 ? "0" + minutes : minutes}`;

      // Get channel
      const channelID = coin.channel;
      if (!channelID) {
        console.error(`❌ No channel set for coin ${coin.id}`);
        return;
      }

      const channel = (await this.client!.client.channels.cache.get(channelID)) as TextChannel;
      if (!channel) {
        console.error(`❌ Channel not found: ${channelID} for coin ${coin.id}`);
        return;
      }

      // Price change calculation (0.00% to 5.00%)
      const min = 0.0;
      const max = 5.0;
      let perc = Math.random() * (max - min) + min;
      let percq = perc / 100;

      let cost = coin.cost;
      let changeAmount = cost * percq;

      const highLimit = coin.highLimit || 100000;
      const lowLimit = coin.lowLimit || 100;

      // Improved limit logic - more flexible
      let direction: "+" | "-";
      if (cost > highLimit) {
        // Force downward when above high limit
        direction = "-";
      } else if (cost < lowLimit) {
        // Force upward when below low limit
        direction = "+";
      } else {
        // Normal random direction
        direction = ["+", "-"][Math.floor(Math.random() * 2)] as "+" | "-";
      }

      let oldCost = Math.floor(cost);
      let newCost = direction === "+" ? cost + changeAmount : cost - changeAmount;
      newCost = Math.floor(newCost);

      // Ensure minimum cost of 1
      if (newCost < 1) newCost = 1;

      // Update coin data
      coin.cost = newCost;

      // Update lastValues array (keep last 20)
      const lastValues = coin.lastValues || [];
      if (lastValues.length >= 20) lastValues.shift();
      lastValues.push(oldCost);
      coin.lastValues = lastValues;

      // Update lastDates array (keep last 20)
      const lastDates = coin.lastDates || [];
      if (lastDates.length >= 20) lastDates.shift();
      lastDates.push(currentTime);
      coin.lastDates = lastDates;

      // Update highest/lowest values
      let isNewHigh = false;
      let isNewLow = false;

      if (newCost > coin.highestValue) {
        coin.highestValue = newCost;
        isNewHigh = true;
      }
      if (newCost < coin.lowestValue) {
        coin.lowestValue = newCost;
        isNewLow = true;
      }

      // Generate chart using QuickChart API
      const chartUrl = await this.generateChart(coin.name, lastDates, lastValues, coin.bcolor);
      coin.chart = chartUrl;

      // Update percentage display
      const emoji = direction === "+" ? "📈" : "📉";
      coin.percentage = `${emoji} ${direction}${perc.toFixed(2).replace(".", ",")}%`;

      // Create embed like AroxV2
      const embed = new EmbedBuilder()
        .setColor(coin.bcolor)
        .setAuthor({
          name: `${coin.name.toUpperCase()} (${coin.id})`,
          iconURL: `https://cdn.discordapp.com/emojis/${this.extractEmojiId(coin.name)}.png`
        })
        .setDescription("You can take a look at the data about this coin below. This data may change at random times.")
        .addFields(
          { name: "📊 Percentage", value: `${emoji} ${direction}${perc.toFixed(2).replace(".", ",")}%`, inline: true },
          { name: "💵 New Cost", value: `${newCost.toLocaleString()}`, inline: true },
          { name: "📍 Old Cost", value: `${oldCost.toLocaleString()}`, inline: true },
          { name: "📤 Launch Cost", value: `${coin.launchCost.toLocaleString()}`, inline: true },
          { name: "📈 Highest Value", value: `${coin.highestValue.toLocaleString()}`, inline: true },
          { name: "📉 Lowest Value", value: `${coin.lowestValue.toLocaleString()}`, inline: true }
        )
        .setImage(chartUrl);

      // Create content message
      let content: string;
      if (isNewLow) {
        content = `📉 **| ${coin.name.toUpperCase()}** was updated. Lowest price reached so far!`;
      } else if (isNewHigh) {
        content = `📈 **| ${coin.name.toUpperCase()}** was updated. Highest price reached so far!`;
      } else {
        const coinEmoji = this.getCoinEmoji(coin.name);
        content = `${coinEmoji} **| ${coin.name.toUpperCase()}** was updated!`;
      }

      await coin.save();

      // Update messages in channel
      await this.updateMessage(channel, embed, coin);
      await this.updateAnnouncement(channel, content, coin);

      console.log(`💰 ${coin.id}: ${oldCost} → ${newCost} (${coin.percentage}) in #${channel.name}`);
    } catch (error) {
      console.error(`❌ Error updating coin ${coin.id}:`, error);
    }
  }

  private async updateMessage(channel: TextChannel, embed: EmbedBuilder, coin: any) {
    while (true) {
      try {
        if (!coin.message) {
          const msg = await channel.send({ embeds: [embed] });
          coin.message = msg.id;
          await coin.save();
          break;
        } else {
          const msg = await channel.messages.fetch(coin.message).catch(() => null);
          if (!msg) {
            coin.message = null;
            console.log(`❌ Message not found for ${coin.id}, retrying...`);
            continue;
          }
          await msg.edit({ embeds: [embed] });
          break;
        }
      } catch (error) {
        console.error(`❌ Error updating message for ${coin.id}:`, error);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  private async updateAnnouncement(channel: TextChannel, content: string, coin: any) {
    while (true) {
      try {
        if (!coin.amessage) {
          const msg = await channel.send(content);
          coin.amessage = msg.id;
          await coin.save();
          break;
        } else {
          const msg = await channel.messages.fetch(coin.amessage).catch(() => null);
          if (!msg) {
            coin.amessage = null;
            console.log(`❌ Announcement message not found for ${coin.id}, retrying...`);
            continue;
          }
          await msg.delete();
          const newMsg = await channel.send(content);
          coin.amessage = newMsg.id;
          await coin.save();
          break;
        }
      } catch (error) {
        console.error(`❌ Error updating announcement for ${coin.id}:`, error);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  private async generateChart(coinName: string, lastDates: string[], lastValues: number[], color: string): Promise<string> {
    try {
      const chartConfig = {
        type: "line",
        data: {
          labels: lastDates,
          datasets: [
            {
              label: coinName.toUpperCase(),
              borderColor: color,
              borderWidth: 2,
              fill: false,
              data: lastValues,
              tension: 0
            }
          ]
        },
        options: {
          responsive: true,
          title: {
            display: true,
            text: `${coinName.toUpperCase()} Value Change Chart`
          },
          tooltips: {
            mode: "index",
            intersect: true
          },
          scales: {
            x: {
              display: true,
              title: {
                display: true,
                text: "Time"
              }
            },
            y: {
              display: true,
              title: {
                display: true,
                text: "Value"
              }
            }
          }
        }
      };

      const response = await axios.post("https://quickchart.io/chart/create", {
        chart: chartConfig
      });

      return response.data.url;
    } catch (error) {
      console.error("❌ Error generating chart:", error);
      return "";
    }
  }

  private extractEmojiId(coinName: string): string {
    // This would extract emoji ID from the coin emoji
    // For now, return empty string if no custom emoji system
    return "";
  }

  private getCoinEmoji(coinName: string): string {
    // Return appropriate emoji from emojis.json coins section
    return (emojis as any).coins[coinName.toUpperCase()] || "🪙";
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      activeCoins: this.coinIntervals.size
    };
  }

  // Add new coin to the loop
  async addCoin(coinId: string) {
    if (!this.isRunning) return;

    const coin = await CoinModel.findOne({ id: coinId });
    if (coin && !this.coinIntervals.has(coinId)) {
      this.startCoinLoop(coin);
      console.log(`🪙 Added ${coinId} to exchange loop`);
    }
  }

  // Remove coin from the loop
  removeCoin(coinId: string) {
    const interval = this.coinIntervals.get(coinId);
    if (interval) {
      clearTimeout(interval);
      this.coinIntervals.delete(coinId);
      console.log(`🗑️ Removed ${coinId} from exchange loop`);
    }
  }

  // Manually refresh a specific coin
  async refreshCoin(coinId: string): Promise<boolean> {
    try {
      const coin = await CoinModel.findOne({ id: coinId });
      if (!coin) {
        console.error(`❌ Coin ${coinId} not found for manual refresh`);
        return false;
      }

      await this.updateCoin(coin);
      console.log(`🔄 Manually refreshed coin ${coinId}`);
      return true;
    } catch (error) {
      console.error(`❌ Error manually refreshing coin ${coinId}:`, error);
      return false;
    }
  }
}

// Export singleton instance
export const exchangeLoop = new ExchangeLoop();
