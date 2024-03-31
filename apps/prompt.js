import fs from 'fs'
import moment from 'moment'
import path from 'path'
import WebSocket from 'ws'
import zlib from 'zlib'

import { pluginRoot } from '../utils/path.js'

const config = JSON.parse(fs.readFileSync(path.join(pluginRoot, 'config.json'), 'utf8'))

/**
 * @typedef goodsItem
 * @property {string} name 商品名称
 * @property {string} city 城市
 * @property {string} type 类型
 * @property {string} trend 趋势
 * @property {number} price 价格
 * @property {number} base_price 基础价格
 * @property {number} ratio 比率
 * @property {number} updatadAt 更新时间
 */

async function prompt () {
  const ws = new WebSocket('wss://goda.srap.link/ws')
  // 监听连接打开事件
  ws.on('open', function open () {
    logger.info('连接服务器')
    // 发送消息到服务器
    ws.send('Hello, server!')
  })

  // 监听从服务器接收到的消息
  ws.on('message', async function incoming (data) {
    zlib.unzip(data, async (err, buffer) => {
      if (err) {
        logger.error('解压缩失败', err)
        return
      }

      // 将Buffer转换为字符串
      const jsonString = buffer.toString()

      // 解析JSON字符串
      try {
        const goods = JSON.parse(jsonString)
        const messages = {}
        const buyGoods = {}
        for (const cityName in goods) {
          /**
           * @type {goodsItem[]} 配置信息
           */
          const goodsList = goods[cityName]
          for (const value of goodsList) {
            const date = moment()
            if (value.type === 'buy') {
              buyGoods[value.name] = value
              const lastTime = await redis.get(`RESONANCE:GATCHA_LASTTIME:${value.type}${value.name}`)
              if (value.ratio <= 53 && value.name === '红茶' && (date.diff(moment(lastTime), 'minutes') > 30 || !lastTime)) {
                messages['红茶'] = [`\n购买${value.city}：￥${value.price}，变动趋势：${value.ratio}%`]
                await redis.set(`RESONANCE:GATCHA_LASTTIME:${value.type}${value.name}`, date.format('YYYY-MM-DD HH:mm:ss'))
              }
            }
          }
        }
        for (const cityName in goods) {
          /**
           * @type {goodsItem[]} 商品信息
           */
          const goodsList = goods[cityName]
          for (const value of goodsList) {
            /**
             * @type {goodsItem} 购买商品信息
             */
            const buyInfo = buyGoods[value.name]
            const date = moment()
            if (value.type === 'sell' && buyInfo) {
              const lastTime = await redis.get(`RESONANCE:GATCHA_LASTTIME:${buyInfo.city}-${value.city}:${value.name}`)
              const hLastTime = await redis.get(`RESONANCE:GATCHA_LASTTIME:${value.type}${value.name}`)
              if (value.price - buyInfo.price >= 1900 && (date.diff(moment(lastTime), 'minutes') > 30 || !lastTime)) {
                if (!Object.prototype.hasOwnProperty.call(messages, `${buyInfo.city}-${value.city}`)) {
                  messages[`${buyInfo.city}-${value.city}`] = [`\n${value.name}：￥${value.price - buyInfo.price}`]
                } else {
                  messages[`${buyInfo.city}-${value.city}`].push(`\n${value.name}：￥${value.price - buyInfo.price}`)
                }
                await redis.set(`RESONANCE:GATCHA_LASTTIME:${buyInfo.city}-${value.city}:${value.name}`, date.format('YYYY-MM-DD HH:mm:ss'))
              } else if (value.ratio >= 148 && value.name === '红茶' && (date.diff(moment(hLastTime), 'minutes') < 30 || !lastTime)) {
                if (!Object.prototype.hasOwnProperty.call(messages, '红茶')) {
                  messages['红茶'] = [`\n售出${value.city}：￥${value.price}，变动趋势：${value.ratio}%`]
                } else {
                  messages['红茶'].push(`\n售出${value.city}：￥${value.price}，变动趋势：${value.ratio}%`)
                }
                await redis.set(`RESONANCE:GATCHA_LASTTIME:${value.type}${value.name}`, date.format('YYYY-MM-DD HH:mm:ss'))
              }
            }
          }
        }
        sendMsg(messages)
      } catch (parseError) {
        logger.error('JSON解析失败', parseError)
      }
    })
  })

  // 监听错误事件
  ws.on('error', function error (error) {
    logger.error('WebSocket error:', error)
  })

  // 监听连接关闭事件
  ws.on('close', function close () {
    logger.info('连接关闭，尝试重连...')
    setTimeout(prompt, 3000)
  })
}

async function sendMsg (messages) {
  const msglist = []
  for (let cityName in messages) {
    if (messages[cityName].length === 0) { continue }
    msglist.push({
      message: [cityName, '\n', ...messages[cityName]]
    })
  }
  config.qq.forEach(async qq => {
    const groupBot = Bot.pickGroup(qq)
    const msgs = await groupBot.makeForwardMsg(msglist)
    await groupBot.sendMsg(msgs)
  })
}
