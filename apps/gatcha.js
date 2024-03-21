/**
 * By: https://github.com/hewang1an/StarRail-plugin
 */
import moment from 'moment'
import common from '../../../lib/common/common.js'
import { rulePrefix } from '../utils/data.js'
import plugin from '../../../lib/plugins/plugin.js'
import runtimeRender from '../common/runtimeRender.js'
import GatchaData from '../utils/gatcha/index.js'

export class Gatcha extends plugin {
  constructor (e) {
    super({
      name: '雷索纳斯抽卡分析',
      dsc: '雷索纳斯抽卡分析',
      /** https://oicqjs.github.io/oicq/#events */
      event: 'message',
      priority: -114514,
      rule: [
        {
          reg: `^${rulePrefix}抽卡链接(绑定)?$`,
          fnc: 'bindAuthKey'
        },
        {
          reg: `^${rulePrefix}抽卡(记录|分析|统计)`,
          fnc: 'gatcha'
        },
        {
          reg: `^${rulePrefix}更新抽卡(记录)?$`,
          fnc: 'updateGatcha'
        }
      ]
    })
  }

  async bindAuthKey (e) {
    if (!e.isPrivate) {
      await this.reply('请私聊绑定', false, { at: true })
      return false
    }
    this.setContext('doBindAuthKey')
    await this.reply('请发送抽卡链接', false, { at: true })
  }

  async doBindAuthKey () {
    if (!this.e.isPrivate) {
      await this.reply('请私聊发送抽卡链接', false, { at: true })
      return false
    }
    let e = this.e
    try {
      let userId = e.user_id
      const ats = e.message.filter(m => m.type === 'at')
      if (ats.length > 0 && !e.atBot) {
        userId = ats[0].qq
      }
      let key = this.e.msg.trim()
      const pid = key.split('pid=')[1].split('&')[0]
      const remoteId = key.split('remote_id=')[1].split('&')[0]
      await redis.set(`RESONANCE:PID:${userId}`, pid)
      await this.reply('绑定成功，正在获取数据', false)
      console.log('uid', userId)
      await redis.set(`RESONANCE:REMOTE_ID:${userId}`, remoteId)
      this.updateGatcha(this.e).then(() => {
        logger.info('绑定抽卡链接任务完成')
      })
    } catch (error) {
      logger.error(error)
      this.reply('抽卡链接错误，请检查日志', false)
    }
    this.finish('doBindAuthKey')
  }

  async updateGatcha (e) {
    let userId = e.user_id
    const ats = e.message.filter(m => m.type === 'at')
    if (ats.length > 0 && !e.atBot) {
      userId = ats[0].qq
    }

    try {
      const { pid, remoteId } = await this.getAuthKey()
      const date = moment()
      const lastTime = await redis.get(`RESONANCE:GATCHA_LASTTIME:${userId}`)

      if (lastTime && date.diff(moment(lastTime), 'h') < 1) {
        await e.reply(`[${userId}]近期已经更新过数据了，上次更新时间：${lastTime}，两次更新间隔请大于1小时`)
        return false
      }

      redis.set(`RESONANCE:GATCHA_LASTTIME:${userId}`, date.format('YYYY-MM-DD HH:mm:ss'))

      await e.reply(`正在获取[${userId}]的抽卡数据...`)
      const gatcha = new GatchaData(userId, pid, remoteId)
      await gatcha.updateData()
      const msg = await common.makeForwardMsg(e, ['抽卡数据获取成功，你可以使用：', '#雷索纳斯抽卡分析', '查看具体的抽卡数据'])
      await e.reply(msg)
    } catch (error) {
      console.log(error)
      await redis.set(`RESONANCE:GATCHA_LASTTIME:${userId}`, '')
      await e.reply('抽卡链接已过期，请重新获取并绑定')
    }
  }

  async getAuthKey () {
    let user = this.e.user_id
    let ats = this.e.message.filter((m) => m.type === 'at')
    if (ats.length > 0 && !this.e.atBot) {
      user = ats[0].qq
    }
    const pid = await redis.get(`RESONANCE:PID:${user}`)
    const remoteId = await redis.get(`RESONANCE:REMOTE_ID:${user}`)
    if (!pid || !remoteId) {
      await this.e.reply(
        `未绑定抽卡链接，请点击链接查看说明\n${this.appconfig.docs}\n发送[#星铁抽卡链接]绑定`
      )
      return false
    }
    return {pid, remoteId}
  }

  async gatcha (e) {
    let user = e.user_id
    const ats = e.message.filter(m => m.type === 'at')
    if (ats.length > 0 && !e.atBot) {
      user = ats[0].qq
    }
    try {
      let type = 0

      const gatcha = new GatchaData(user, '', '')
      const stat = await gatcha.stat(type)
      await runtimeRender(e, '/gatcha/new.html', {
        ...stat,
        user,
        type,
        filterRank: type === 0 ? 5 : 4
      })
    } catch (err) {
      logger.error(err)
      await e.reply('本地暂无抽卡记录，请发送#雷索纳斯更新抽卡，更新抽卡记录')
    }
  }
}
