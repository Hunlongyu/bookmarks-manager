import { Progress } from './bookmarks'
type CallBack = ((arg?: any)=> void) | null

let _stepCall:CallBack = null
let _finishCall:CallBack = null
const progress: Progress = {
  total: 0,
  pass: 0,
  passP: 0,
  fail: 0,
  failP: 0
}
export class Generator {
  stopRunning:boolean
  gen?:globalThis.Generator<() => Promise<any>> | null
  constructor () {
    this.stopRunning = false
  }

  created (list: Array<() => Promise<void>>): void {
    function * gen () {
      const length = list.length
      progress.total = length
      for (let index = 0; index < length; index++) {
        const item = list[index]
        yield item
      }
    }
    this.gen = gen()
  }

  async run (stepCall:CallBack, finishCall:CallBack): Promise<void> {
    !_stepCall && (_stepCall = stepCall) // 缓存一下，等到继续上传的时候使用
    !_finishCall && (_finishCall = finishCall) // 缓存一下，等到继续上传的时候使用
    if (this.stopRunning || !this.gen) return
    const next = this.gen.next()
    if (!next.done) {
      next.value().then(() => {
        progress.pass++
        const p = ((progress.pass / progress.total) * 100).toFixed(2)
        progress.passP = Number(p)
        // stepCall && stepCall(progress)
      }).catch(() => {
        progress.fail++
        const p = ((progress.fail / progress.total) * 100).toFixed(2)
        progress.failP = Number(p)
        // invalidArr.push(i)
      }).finally(() => {
        stepCall && stepCall(progress)
        if (progress.pass + progress.fail === progress.total) {
          finishCall && finishCall(progress)
        }
      })
    }
    if (next.done) {
      this.gen = null
      finishCall && finishCall()
      _stepCall = null
      _finishCall = null
    }

    this.run(stepCall, finishCall)
  }

  stop (): void {
    console.log('stop')
    this.stopRunning = true
  }

  continue (): void {
    this.stopRunning = false
    this.run(_stepCall, _finishCall)
  }

  cancel (): void {
    this.gen = null
    this.stopRunning = false
    _stepCall = null
    _finishCall = null
  }
}
