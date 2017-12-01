import json2csv from 'json2csv'
import fastcsv from 'fast-csv'
import merge from 'merge-stream'
import _ from 'lodash'
import fs from 'fs-extra'
import path from 'path'
import makeDebug from 'debug'
import { getStoreFromHook, addOutput } from '../utils'

const debug = makeDebug('krawler:hooks:csv')

// Generate a CSV from specific hook result values
export function writeCSV (options = {}) {
  return async function (hook) {
    if (hook.type !== 'after') {
      throw new Error(`The 'writeCSV' hook should only be used as a 'after' hook.`)
    }

    let store = await getStoreFromHook(hook, 'writeCSV', options.storePath)
    if (!store.path) {
      throw new Error(`The 'writeCSV' hook only work with the fs blob store.`)
    }

    return new Promise((resolve, reject) => {
      debug('Creating CSV for ' + hook.data.id)
      let csv = json2csv({ data: _.get(hook, options.dataPath || 'result'), fields: options.fields })
      let filePath = path.join(store.path, hook.data.id + '.csv')
      debug('Exporting CSV to ' + filePath)
      fs.outputFile(filePath, csv)
      .then(() => {
        addOutput(hook.result, hook.data.id + '.csv', options.outputType)
        resolve(hook)
      })
      .catch(reject)
    })
  }
}

// Generate a CSV from different ones in the output store
export function mergeCSV (options = {}) {
  return async function (hook) {
    if (hook.type !== 'after') {
      throw new Error(`The 'mergeCSV' hook should only be used as a 'after' hook.`)
    }

    let store = await getStoreFromHook(hook, 'mergeCSV', options.storePath)

    return new Promise((resolve, reject) => {
      debug('Merging CSV for ' + hook.data.id)
      let inputStreams = hook.result.map(result => {
        let stream = store.createReadStream(result.id + '.csv')
        return fastcsv.fromStream(stream, options)
      })

      merge.apply(null, inputStreams)
      .pipe(fastcsv.createWriteStream(options))
      .pipe(store.createWriteStream(hook.data.id + '.csv'))
      .on('finish', () => {
        addOutput(hook.result, hook.data.id + '.csv', options.outputType)
        resolve(hook)
      })
      .on('error', reject)
    })
  }
}

// Read a CSV from an input stream/store and convert to JSON values
export function readCSV (options = {}) {
  return async function (hook) {
    if (hook.type !== 'after') {
      throw new Error(`The 'readCSV' hook should only be used as a 'after' hook.`)
    }

    let store = await getStoreFromHook(hook, 'readCSV', options.storePath)

    return new Promise((resolve, reject) => {
      debug('Reading CSV for ' + hook.result.id)
      let stream = hook.result.stream
        ? hook.result.stream : store.createReadStream(hook.result.id)

      fastcsv.fromStream(stream, options)
      .on('data', data => {
        let json = _.get(hook, options.dataPath || 'result.data', [])
        json.push(data)
        _.set(hook, options.dataPath || 'result.data', json)
      })
      .on('end', () => resolve(hook))
      .on('error', reject)
    })
  }
}
