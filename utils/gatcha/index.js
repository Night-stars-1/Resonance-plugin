/* eslint-disable prefer-promise-reject-errors */
/* eslint-disable camelcase */
import fs from 'fs'
import path from 'path'
import _ from 'lodash'
import { getRecords } from './gatcha.js'
import { getNameById } from '../data.js'
import { pluginRoot } from '../path.js'
import { poolData } from './poolData.js'
import moment from 'moment'

export default class GatchaData {
  constructor (uid, pid, remoteId) {
    this.uid = uid
    this.pid = pid
    this.remoteId = remoteId
    this.data = []
  }

  async getData (gatchaType) {
    if (gatchaType !== null && gatchaType !== undefined) {
      const filePath = this.getFilePath(gatchaType)
      if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath))
      } else {
        return Promise.reject('抽卡记录不存在')
      }
    }
    return Promise.reject('查询type为空')
  }

  // 卡池统计
  async stat (gatchaType = 0) {
    /** 当前卡池 */
    const currPool = _.find(poolData, (v) => isDateOnRange(v.from, v.to))

    const obj = {
      /** 本地记录起始时间 */
      localFirstTime: '2077-06-06 00:00:00',
      /** 本地记录结束时间 */
      localLastTime: '2007-06-06 00:00:00',
      /** 名称 */
      name: '',
      /** 总抽卡数 */
      totalNum: 0,
      /** 常驻池总抽卡数 */
      totalNum1: 0,
      /** 限定池总抽卡数 */
      totalNum11: 0,
      /** 本期相关信息 */
      currInfo: {
        /** 本期总抽卡数 */
        totalNum: 0,
        /** 当期已抽未出 */
        last: { 4: 0, 5: 0 },
        currPool
      }
    }

    // 当前时间节点存在活动卡池
    if (currPool) {
      obj.localFirstTime = currPool.to
      obj.localLastTime = currPool.from
    }
    const map = new Map()

    function withList (list) {
      const limits = { 3: 1, 4: 0, 5: 0 }
      return _.map(_.reverse(list), (item) => {
        obj.currInfo.totalNum++
        const newItem = { roleId: item.role_id, timestamp: item.obtain_time, rank: 3 }
        const roleData = getNameById(item.role_id)
        const rank = roleData.rank
        newItem.name = roleData.name
        newItem.until = withUntilPlus(limits, rank)
        obj.currInfo.last[4] = limits[4]
        obj.currInfo.last[5] = limits[5]
        newItem.rank = rank
        return newItem
      })
    }

    if (gatchaType === 0) {
      const data = await this.getData(0)
      map.set(0, withList(data.records))
      obj.name = data.name
    }

    obj.totalNum = getMapValueLength(map, 0)
    obj.totalNum11 = getMapValueLength(map, 0)
    obj.data = _.filter([
      {
        type: 0,
        typeName: '测试',
        records: _.reverse(map.get(0))
      }
    ], (v) => !_.isEmpty(v.records))
    return obj
  }

  async updateData () {
    if (this.pid && this.remoteId) {
      const records_0 = this.merge(await this.readJSON(this.getFilePath(0)), await getRecords(this.pid, this.remoteId))
      if (records_0.records.length === 0) {
        throw new Error('抽卡记录为空, 可能是pid或remote_id过期')
      }
      await this.writeJSON(this.getFilePath(0), records_0)
    } else {
      throw new Error('pid或remote_id 为空')
    }
  }

  async writeJSON (filePath, data) {
    const newData = JSON.stringify(data, null, 2)
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true })
    try {
      await fs.promises.access(filePath, fs.constants.F_OK)
      await fs.promises.writeFile(filePath, newData, 'utf-8')
      return true
    } catch (error) {
      await fs.promises.appendFile(filePath, newData, 'utf-8')
      return false
    }
  }

  async readJSON (filePath) {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath))
    } else {
      return { records: [], user_name: '', uid: '' }
    }
  }

  merge (oldData, newData) {
    if (oldData.uid && oldData.uid !== newData.uid) {
      throw new Error('uid 不一致')
    }
    const lastItemId = oldData.records?.[0]?.role_id || ''
    const newArr = {
      records: [],
      name: newData.name
    }
    for (let i = 0; i < newData.records.length; i++) {
      const curr = newData.records[i]
      if (curr.role_id === lastItemId) {
        break
      }
      newArr.records.push(curr)
    }
    return newArr
  }

  getFilePath (poolId) {
    return `${pluginRoot}/data/gatcha/${this.uid}/${poolId}.json`
  }
}

function getMapValueLength (map, key) {
  return map.get(key)?.length || 0
}

function isDateOnRange (startDate, endDate, date) {
  const curr = date || moment()
  return curr.diff(moment(startDate)) > 0 && curr.diff(moment(endDate)) < 0
}

function withUntilPlus (obj, rank) {
  obj[4]++
  obj[5]++
  const temp = obj[rank]
  if (rank === 4 || rank === 5) {
    obj[rank] = 0
    if (rank === 5) {
      obj[4] = 0
    }
  }
  return temp
}
