import fs from 'fs'
import path from 'path'
import moment from 'moment'
import WebSocket from 'ws'
import zlib from 'zlib'

import plugin from '../../../lib/plugins/plugin.js'
import { rulePrefix } from '../utils/data.js'
import { pluginRoot, pluginResources } from '../utils/path.js'

const config = JSON.parse(fs.readFileSync(path.join(pluginRoot, 'config.json'), 'utf8'))

const cityGoodsData = JSON.parse(fs.readFileSync(path.join(pluginResources, 'goods', 'CityGoodsData.json'), 'utf8'))
const cityData = JSON.parse(fs.readFileSync(path.join(pluginResources, 'goods', 'CityData.json'), 'utf8'))
const attachedToCityData = JSON.parse(fs.readFileSync(path.join(pluginResources, 'goods', 'AttachedToCityData.json'), 'utf8'))
const cityTiredData = JSON.parse(fs.readFileSync(path.join(pluginResources, 'goods', 'CityTiredData.json'), 'utf8'))

/**
 * @typedef {Object} CityData
 * @property {number} buyNum 购买数量
 * @property {number} revenue 税率
 */

/**
 * @typedef {Object} ChangePrice
 * @property {number} percentage 提高或降低价格的百分比
 * @property {number} profit 提高或降低价格的利润
 */

/**
 * @typedef {Object.<string, number>} CityLevel
 * 表示每个城市的等级，键是城市名称，值是城市等级
 */

/**
 * @typedef {Object} UserData
 * @property {CityLevel} cityLevel 每个城市的等级数据
 * @property {Object.<string, CityData>} cityData 每个城市的数据
 * @property {number} maxGoodsNum 最大商品数量
 * @property {boolean} isBookProfit 是否启用书本利润
 * @property {boolean} isTiredProfit 是否启用疲劳利润
 * @property {Object.<string, ChangePrice>} go 去程价格
 * @property {Object.<string, ChangePrice>} back 反程价格
 */

/**
 * @typedef {Object} bookRoutes
 * @property {string} buyCityName 购买城市名称
 * @property {string} sellCityName 出售城市名称
 * @property {number} profit 利润
 * @property {number} tiredProfit 疲劳利润
 * @property {number} bookProfit 书本利润
 * @property {number} buyPrice 购买价格
 * @property {number} sellPrice 出售价格
 * @property {number} cityTired 城市疲劳
 * @property {number} book 书本数量
 * @property {number} num 商品数量
 * @property {Object.<string, CityData>} goodsData 商品数据
 */

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

const skillData = {
  朱利安: { 1: { goods: ['斑节虾'], param: 0.2 } },
  狮鬃: {
    1: { goods: ['荧光棒'], param: 0.2 },
    4: { goods: ['扬声器'], param: 0.2 }
  },
  魇: {
    1: { goods: ['刀具'], param: 0.2 },
    5: { goods: ['刀具'], param: 0.1 }
  },
  塞西尔: {
    4: { goods: ['香水'], param: 0.2 },
    5: { goods: ['香水'], param: 0.3 }
  },
  雷火: { 4: { goods: ['曼德工具箱'], param: 0.2 } },
  黛丝莉: {
    4: { goods: ['毛绒玩具'], param: 0.2 },
    5: { goods: ['毛绒玩具'], param: 0.1 }
  },
  艾略特: { 4: { goods: ['游戏卡带', '游戏机'], param: 0.2 } },
  多萝西: {
    4: { goods: ['弹丸加速装置'], param: 0.2 },
    5: { goods: ['弹丸加速装置'], param: 0.1 }
  },
  星花: { 1: { goods: ['人工晶花'], param: 0.2 } },
  瑞秋: { 4: { goods: ['医药品'], param: 0.2 } },
  菲妮娅: {
    4: { goods: ['大龙虾'], param: 0.2 },
    5: { goods: ['大龙虾'], param: 0.1 }
  },
  瓦伦汀: {
    4: { goods: ['学会书籍'], param: 0.2 },
    5: { goods: ['学会书籍'], param: 0.1 }
  },
  阿知波: {
    4: { goods: ['拼装 模型'], param: 0.2 },
    5: { goods: ['拼装模型'], param: 0.1 }
  },
  闻笙: {
    4: { goods: ['限定公仔'], param: 0.2 },
    5: { goods: ['限定公仔'], param: 0.1 }
  },
  山岚: { 4: { goods: ['折扇'], param: 0.2 } },
  叶珏: {
    1: { goods: ['红茶'], param: 0.2 },
    4: { goods: ['家用太阳能电池组'], param: 0.2 },
    5: { goods: ['红茶'], param: 0.1 }
  },
  隼: {
    1: { goods: ['发动机'], param: 0.2 },
    4: {
      goods: ['弹丸加速装置', '发动机', '沃德烤鸡', '红茶'],
      param: -0.005
    },
    5: {
      goods: ['斑节虾', '人工晶花', '桦石发财树', '石墨烯'],
      param: -0.005
    }
  },
  奈弥: {
    1: { goods: ['金箔酒'], param: 0.2 },
    5: { goods: ['金箔酒'], param: 0.1 }
  },
  伊尔: {
    1: { goods: ['阿妮塔101民用无人机'], param: 0.2 },
    5: { goods: ['阿妮塔101民用无人机'], param: 0.1 }
  },
  卡洛琳: {
    4: { goods: ['石墨烯'], param: 0.2 },
    5: { goods: ['石墨烯'], param: 0.1 }
  }
}

const userData = {
  cityLevel: {
    '7号自由港': 12,
    修格里城: 11,
    曼德矿场: 11,
    澄明数据中心: 14,
    荒原站: 11
  },
  cityData: {
    '7号自由港': {
      buyNum: 0.1,
      revenue: 0.1
    }
  },
  isBookProfit: true,
  isTiredProfit: false,
  go: {
    raisePrice: {
      percentage: 0.2,
      profit: 30
    },
    cutPrice: {
      percentage: 0.2,
      profit: 30
    }
  },
  back: {
    raisePrice: {
      percentage: 0.2,
      profit: 30
    },
    cutPrice: {
      percentage: 0.2,
      profit: 30
    }
  },
  skillevel: {
    星花: 4,
    卡洛琳: 0,
    伊尔: 4,
    菲妮娅: 4,
    叶珏: 5,
    黛丝莉: 1,
    阿知波: 1,
    塞西尔: 1,
    瓦伦汀: 1,
    魇: 1,
    奈弥: 1,
    甘雅: 1,
    艾略特: 1,
    朱利安: 1,
    瑞秋: 1,
    山岚: 1,
    卡莲: 1,
    静流: 1,
    雷火: 1,
    狮鬃: 1
  },
  goodsAddition: {},
  maxGoodsNum: 625
}

for (const roleName in userData.skillevel) {
  const level = userData.skillevel[roleName]
  const roleSkillData = skillData[roleName]

  for (const skillAffect in roleSkillData) {
    if (level >= Number(skillAffect)) {
      const { goods, param } = roleSkillData[skillAffect]

      for (const goodName of goods) {
        if (!(goodName in userData.goodsAddition)) {
          userData.goodsAddition[goodName] = param
        } else {
          userData.goodsAddition[goodName] += param
        }
      }
    }
  }
}

userData.cityData = getCityDataByCityLevel(userData.cityLevel)
const maxBook = 10
let message = '暂无'

/**
* 根据城市名称获取书本路线最佳路线
* @param {bookRoutes[]} bookRoutes
* @param {string} buyCityName 购买城市名称
* @param {string} sellCityName 出售城市名称
* @param {number} book 书本数量
* @returns
*/
function getBookRoutesbyCityName (bookRoutes, buyCityName, sellCityName, book, type = 'tiredProfit') {
  const bookRoute = bookRoutes.filter(route => route.buyCityName === buyCityName && route.sellCityName === sellCityName && route.book <= 10 - book)
  return bookRoute.reduce((maxObj, obj) => obj[type] > maxObj[type] ? obj : maxObj, bookRoute[0])
}

/**
* 设置购买商品价格
* @param {string} cityName 站点名称
* @param {object} target 目标站点信息
* @param {number} buy_num 额外购买数量
* @returns
*/
function setBuyGoods (cityName, target, userData, buyList) {
  for (const goodName in buyList[cityName]) {
    if (target.num < userData.maxGoodsNum) {
      const buyNum = userData.cityData[cityName].buyNum
      const skillNum = userData.goodsAddition[goodName] ?? 0
      const oldNum = Math.round(buyList[cityName][goodName].num * (1 + buyNum + skillNum))
      const num = userData.maxGoodsNum - (target.num + oldNum) > 0 ? oldNum : userData.maxGoodsNum - target.num
      const price = buyList[cityName][goodName].price
      if (!Object.prototype.hasOwnProperty.call(target.goodsData, goodName)) {
        target.goodsData[goodName] = {
          num,
          price
        }
      } else {
        target.goodsData[goodName].num += num
      }
      target.num += num
      target.price += price * num
    }
  }
  return target
}

/**
* 通过站点等级获取站点数据
* @param {object} cityLevel 站点等级
* @returns {Object.<string, cityLevelData>}
*/
function getCityDataByCityLevel (cityLevel) {
  const cityLevelData = {}
  for (const attachedName in attachedToCityData) {
    const cityName = attachedToCityData[attachedName]
    if (cityLevel[cityName] === undefined) continue
    const level = cityLevel[cityName] + 1
    cityLevelData[attachedName] = cityData[cityName][level]
  }
  return cityLevelData
}

/**
* 获取最优路线
* @param {UserData} userData 用户数据
* @param {number} maxBook 最大购买次数
* @returns 最优路线
*/
function getOptimalRoute (userData, maxBook, buyList, sellList) {
  const routes = []
  for (const buyCityName in buyList) {
    let target = {
      goodsData: {},
      num: 0,
      price: 0,
      book: 0,
      maxBook
    }
    // 0本书，基础量
    target = setBuyGoods(buyCityName, target, userData, buyList)
    while (target.num < 400 && target.book < target.maxBook) {
      target.book += 1
      target = setBuyGoods(buyCityName, target, userData, buyList)
    }
    for (const sellCityName in sellList) {
      let sellPrice = 0
      for (const goodsName in target.goodsData) {
        const num = target.goodsData[goodsName].num
        const buyPrice = target.goodsData[goodsName].price
        const noRevenueSellPrice = sellList[sellCityName][goodsName].price
        const taxRate = userData.cityData[sellCityName].revenue
        const revenue = (noRevenueSellPrice - buyPrice) * taxRate
        sellPrice += Math.round((noRevenueSellPrice - revenue) * num)
      }
      const taxRate = userData.cityData[buyCityName].revenue
      const buyPrice = Math.round(target.price * (1 + taxRate))
      const cityTired = (cityTiredData[`${buyCityName}-${sellCityName}`] ?? 99999)
      routes.push({
        buyCityName,
        sellCityName,
        taxRate,
        buyPrice,
        sellPrice,
        cityTired,
        book: target.book,
        num: target.num,
        goodsData: target.goodsData
      })
    }
  }
  return routes
}

/**
* 获取利润
* @param {UserData} userData
* @param {bookRoutes[]} routes
* @param {string} type
* @returns
*/
function getRoutesProfit (userData, routes, type = 'go') {
  /**
   * @type {bookRoutes[]}
   */
  const deeProutes = JSON.parse(JSON.stringify(routes))
  deeProutes.forEach(route => {
    // 计算抬价后的价格
    route.sellPrice = Math.round(route.sellPrice * (1 + userData[type].raisePrice.percentage))
    // 计算降价后的价格
    route.buyPrice = Math.round(route.buyPrice * (1 - userData[type].cutPrice.percentage))
    route.cityTired = route.cityTired + userData[type].raisePrice.profit + userData[type].cutPrice.profit
    route.profit = route.sellPrice - route.buyPrice
    route.tiredProfit = Math.round(route.profit / route.cityTired)
    route.bookProfit = route.book === 0 ? 0 : Math.round(route.profit / route.book)
  })
  return deeProutes
}

function getGoOptimalRouteByTiredProfit (userData, buyList, sellList) {
  const bookProfits = []
  // 遍历书本获取单书最优路线
  for (let book = 1; book + 1 < maxBook; book++) {
    const routes = getOptimalRoute(userData, book, buyList, sellList)
    const route = routes.reduce((maxObj, obj) => obj.tiredProfit > maxObj.tiredProfit ? obj : maxObj, routes[0])
    bookProfits.push(route)
  }

  // 获取最优路线
  const route = bookProfits.reduce((maxObj, obj) => obj.tiredProfit > maxObj.tiredProfit ? obj : maxObj, bookProfits[0])
  const goodsNum = Object.keys(route.goodsData).map(name => name + route.goodsData[name].num).join(',')
  const message = `${route.buyCityName}-${route.sellCityName} -> 商品数量: ${goodsNum} 商品总量: ${route.num} 商品利润: ${route.profit} 疲劳利润: ${route.tiredProfit} 书本数量: ${route.book}`
  return message
}

/**
* 通过疲劳利润获取最优路线
* @param {UserData} userData
* @param {*} buyList
* @param {*} sellList
* @returns
*/
function getGoBackOptimalRouteByTiredProfit (userData, buyList, sellList) {
  const bookProfits = []
  /**
   * @type {bookRoutes[]}
   */
  const bookRoutes = []
  /**
   * @type {bookRoutes[]}
   */
  const goRoutes = []
  for (let book = 0; book + 1 < maxBook; book++) {
    const routes = getOptimalRoute(userData, book, buyList, sellList)
    bookRoutes.push(...getRoutesProfit(userData, routes, 'back'))
    goRoutes.push(...getRoutesProfit(userData, routes, 'go'))
  }

  // 遍历书本获取单书最优路线
  for (let book = 0; book + 1 < maxBook; book++) {
    // const routes = getOptimalRoute(userData, book, buyList, sellList)
    const routes = goRoutes.filter(route => route.book === book)
    if (routes.length === 0) continue
    const route = routes.reduce(
      (maxObj, obj) => obj.bookProfit + getBookRoutesbyCityName(bookRoutes, obj.sellCityName, obj.buyCityName, obj.book).bookProfit >=
              maxObj[0].bookProfit + maxObj[1].bookProfit
        ? [obj, getBookRoutesbyCityName(bookRoutes, obj.sellCityName, obj.buyCityName, obj.book)]
        : maxObj,
      [routes[0], getBookRoutesbyCityName(bookRoutes, routes[0].sellCityName, routes[0].buyCityName, routes[0].book)])
    bookProfits.push(route)
  }
  // 计算基准单书利润，用于去除异常数据
  let benchmarkProfit = 0
  bookProfits.forEach(item => {
    benchmarkProfit += (item[0].bookProfit + item[1].bookProfit)
  })
  benchmarkProfit = benchmarkProfit / bookProfits.length
  // console.log(bookProfits, bookProfits.filter(obj => obj[0].bookProfit + obj[1].bookProfit > benchmarkProfit)[0][0].buyPrice, bookProfits.filter(obj => obj[0].bookProfit + obj[1].bookProfit > benchmarkProfit)[0][0].test)
  // 根据单位疲劳获取最优路线
  const route = bookProfits.reduce((maxObj, obj) =>
    obj[0].tiredProfit + obj[1].tiredProfit > maxObj[0].tiredProfit + maxObj[1].tiredProfit &&
          obj[0].bookProfit + obj[1].bookProfit > benchmarkProfit
      ? obj
      : maxObj, bookProfits[0])
  return route
}

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
        const buyList = {}
        const sellList = {}
        for (const cityName in goods) {
          const cityInfo = goods[cityName]
          buyList[cityName] = {}
          sellList[cityName] = {}
          cityInfo.forEach(item => {
            if (item.type === 'buy') {
              item.num = cityGoodsData[item.city][item.name].num
              if (cityGoodsData[item.city][item.name].isSpeciality) buyList[item.city][item.name] = item
            } else if (item.type === 'sell') {
              sellList[item.city][item.name] = item
            }
          })
        }
        const route = getGoBackOptimalRouteByTiredProfit(userData, buyList, sellList)
        const lastTime = await redis.get(`RESONANCE:GOODS_LASTTIME:${route[0].buyCityName}:${route[0].book}<->${route[0].sellCityName}:${route[1].book}`)
        const date = moment()
        const toGoodsNum = Object.keys(route[0].goodsData).map(name => name + route[0].goodsData[name].num).join(',')
        const backGoodsNum = Object.keys(route[1].goodsData).map(name => name + route[1].goodsData[name].num).join(',')
        message = `${route[0].buyCityName}<->${route[0].sellCityName}:
${route[0].buyCityName}:
    商品数量: ${toGoodsNum}
    商品总量: ${route[0].num}
    购买价格: ${route[0].buyPrice}
    出售价格: ${route[0].sellPrice}
    商品利润: ${route[0].profit}
    所需疲劳: ${route[0].cityTired}
    疲劳利润: ${route[0].tiredProfit}
    单书利润: ${route[0].bookProfit}
    书本数量: ${route[0].book}
${route[0].sellCityName}:
    商品数量: ${backGoodsNum}
    商品总量: ${route[1].num}
    购买价格: ${route[1].buyPrice}
    出售价格: ${route[1].sellPrice}
    商品利润: ${route[1].profit}
    所需疲劳: ${route[1].cityTired}
    疲劳利润: ${route[1].tiredProfit}
    单书利润: ${route[1].bookProfit}
    书本数量: ${route[1].book}
总计:
    利润: ${route[0].profit + route[1].profit}
    所需疲劳: ${route[0].cityTired + route[1].cityTired}
    疲劳利润: ${route[0].tiredProfit + route[1].tiredProfit}
    单书利润: ${route[0].bookProfit + route[1].bookProfit}
    书本数量: ${route[0].book + route[1].book}`
        if (route[0].tiredProfit + route[1].tiredProfit > 8000 && (date.diff(moment(lastTime), 'minutes') >= 10 || !lastTime)) {
          sendMsg(message)
          await redis.set(`RESONANCE:GOODS_LASTTIME:${route[0].buyCityName}:${route[0].book}<->${route[0].sellCityName}:${route[1].book}`, date.format('YYYY-MM-DD HH:mm:ss'))
        }
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
  if (typeof messages !== 'string') {
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
  } else {
    config.qq.forEach(async qq => {
      const groupBot = Bot.pickGroup(qq)
      await groupBot.sendMsg(messages)
    })
  }
}

export class Goods extends plugin {
  constructor (e) {
    super({
      name: '雷索纳斯商品行情',
      dsc: '雷索纳斯商品行情',
      /** https://oicqjs.github.io/oicq/#events */
      event: 'message',
      priority: -114514,
      rule: [
        {
          reg: `^${rulePrefix}(商品)?行情$`,
          fnc: 'goods'
        }
      ]
    })
  }

  async goods (e) {
    await e.reply(message)
  }
}
