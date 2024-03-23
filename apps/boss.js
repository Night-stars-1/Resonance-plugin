/**
 * By: https://github.com/hewang1an/StarRail-plugin
 */
import { rulePrefix } from '../utils/data.js'
import plugin from '../../../lib/plugins/plugin.js'
import runtimeRender from '../common/runtimeRender.js'
import { getBoss } from '../utils/api/boss.js'

export class Boss extends plugin {
  constructor (e) {
    super({
      name: '雷索纳斯BOSS详细',
      dsc: '雷索纳斯BOSS详细',
      /** https://oicqjs.github.io/oicq/#events */
      event: 'message',
      priority: -114514,
      rule: [
        {
          reg: `^${rulePrefix}BOSS(详细|详情|详细信息)?$`,
          fnc: 'boss'
        }
      ]
    })
  }

  async boss (e) {
    let user = e.sender.nickname
    const ats = e.message.filter(m => m.type === 'at')
    if (ats.length > 0 && !e.atBot) {
      user = ats[0].qq
    }
    try {
      const data = await getBoss()
      await runtimeRender(e, '/boss/index.html', {
        data,
        user
      })
    } catch (err) {
      logger.error(err)
      await e.reply('BOSS信息获取失败，请稍后再试')
    }
  }
}
