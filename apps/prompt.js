import fs from 'fs'
import path from 'path'
import WebSocket from 'ws'
import moment from 'moment'
import zlib from 'zlib'

import { pluginRoot } from '../utils/path.js'

const config = JSON.parse(fs.readFileSync(path.join(pluginRoot, 'config.json'), 'utf8'))

let goodsList = [
  {
    name: '扬声器',
    city: '澄明数据中心',
    type: 'buy',
    trend: 'down',
    price: '1027',
    base_price: '960',
    ratio: 107,
    updatadAt: 1711086071828
  }
]

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
        for (let cityName in goods) {
          goodsList = goods[cityName]
          const goodsInfo = (await Promise.all(goodsList.map(async value => {
            const date = moment()
            const lastTimeKey = `RESONANCE:GATCHA_LASTTIME:${value.type}${value.name}`
            const lastTime = await redis.get(lastTimeKey)
            if (lastTime && date.diff(moment(lastTime), 'minutes') < 30) return null
            // 不记录低价商品
            if (value.price < 1000 && value.name !== '红茶') return null
            if (value.type === 'buy') {
              if ((value.ratio <= 55 && value.name === '红茶') || (value.ratio <= 90 && value.name !== '红茶')) {
                await redis.set(lastTimeKey, date.format('YYYY-MM-DD HH:mm:ss'))
                return `发现低价购入商品：${value.name}，价格：${value.price}，跌幅：${value.ratio}%\n`
              }
            } else if (value.type === 'sell') {
              if ((value.ratio >= 120 && value.name === '红茶') || (value.ratio >= 110 && value.name !== '红茶')) {
                await redis.set(lastTimeKey, date.format('YYYY-MM-DD HH:mm:ss'))
                return `发现高价售出商品：${value.name}，价格：${value.price}，涨幅：${value.ratio}%\n`
              }
            }
            return null
          }))).filter(message => message !== null)

          messages[cityName] = goodsInfo
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
prompt()

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
