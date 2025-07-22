/**
 * BPMDetective - 增强版音频 BPM (节拍率) 检测库
 * 支持强拍/弱拍识别，分析音乐小节结构
 */
class BPMDetective {
  constructor(audioBuffer, options = {}) {
    this.audioBuffer = audioBuffer
    this.sampleRate = audioBuffer.sampleRate
    this.options = {
      minBPM: 60, // 最小 BPM 值（默认 60）
      maxBPM: 200, // 最大 BPM 值（默认 200）
      step: 0.5, // BPM 检测步长（默认 0.5）
      beatsPerBar: 4, // 每小节拍数（默认 4/4 拍）
      strongBeatThreshold: 1.2, // 强拍能量阈值（相对于平均值）
      timePrecision: 2, // 时间精度（小数点后位数）
      ...options,
    }
  }

  async detect() {
    const channelData = this.getMonoChannelData()
    const beatCandidates = this.findBeatCandidates(channelData)
    const bpmCandidates = this.findBPMCandidates(beatCandidates)
    const { bpm, confidence } = this.selectBestBPM(bpmCandidates)
    const beats = this.findBeats(channelData, bpm)

    // 识别强拍和弱拍
    const { strongBeats } = this.identifyStrongBeats(channelData, beats, bpm)

    // 格式化节拍数据，合并强弱拍并添加类型标记
    const formattedBeats = beats.map((pos, index) => {
      const time = parseFloat((pos / this.sampleRate).toFixed(this.options.timePrecision))
      return {
        time, // 节拍时间（秒，精确到指定小数位）
        index, // 节拍索引
        isStrong: strongBeats.includes(index), // 是否为强拍
      }
    })

    return {
      bpm,
      confidence,
      beats: formattedBeats, // 包含强弱标记的节拍数组
      barCount: Math.ceil(beats.length / this.options.beatsPerBar), // 小节数量
    }
  }

  // 获取单声道音频数据
  getMonoChannelData() {
    const { numberOfChannels, length } = this.audioBuffer

    if (numberOfChannels === 1) {
      return this.audioBuffer.getChannelData(0)
    }

    // 合并多声道为单声道
    const monoData = new Float32Array(length)
    const channelData = Array.from({ length: numberOfChannels }, (_, i) =>
      this.audioBuffer.getChannelData(i)
    )

    for (let i = 0; i < length; i++) {
      let sum = 0
      for (let ch = 0; ch < numberOfChannels; ch++) {
        sum += channelData[ch][i]
      }
      monoData[i] = sum / numberOfChannels
    }

    return monoData
  }

  // 寻找节拍候选点
  findBeatCandidates(channelData) {
    const sampleRate = this.sampleRate
    const bufferSize = 2048
    const hopSize = 512
    const minPeakDistance = Math.floor(sampleRate / 4) // 最小峰值距离（0.25秒）

    // 1. 计算能量包络
    const energyEnvelope = this.calculateEnergyEnvelope(channelData, bufferSize, hopSize)

    // 2. 应用高通滤波器增强节拍特征
    const filteredEnvelope = this.highPassFilter(energyEnvelope, 3)

    // 3. 寻找峰值（节拍候选点）
    const peakPositions = this.findPeaks(filteredEnvelope, minPeakDistance)

    // 4. 转换为样本位置
    return peakPositions.map((pos) => pos * hopSize)
  }

  // 计算能量包络
  calculateEnergyEnvelope(channelData, bufferSize, hopSize) {
    const energyEnvelope = []
    const length = channelData.length

    for (let i = 0; i < length - bufferSize; i += hopSize) {
      let energy = 0

      for (let j = 0; j < bufferSize; j++) {
        const value = channelData[i + j]
        energy += value * value
      }

      energyEnvelope.push(Math.sqrt(energy / bufferSize))
    }

    return energyEnvelope
  }

  // 高通滤波器
  highPassFilter(data, order) {
    const filtered = [...data]

    for (let i = 0; i < order; i++) {
      for (let j = 2; j < filtered.length; j++) {
        filtered[j] = filtered[j] - 0.97 * filtered[j - 1]
      }
    }

    return filtered
  }

  // 寻找峰值
  findPeaks(data, minDistance) {
    const peaks = []
    const length = data.length

    for (let i = 1; i < length - 1; i++) {
      // 当前点是局部最大值
      if (data[i] > data[i - 1] && data[i] > data[i + 1]) {
        // 确保与之前的峰值足够远
        if (peaks.length === 0 || i - peaks[peaks.length - 1] > minDistance) {
          peaks.push(i)
        }
      }
    }

    return peaks
  }

  // 寻找可能的 BPM 候选值
  findBPMCandidates(beatPositions) {
    const sampleRate = this.sampleRate
    const { minBPM, maxBPM, step } = this.options

    // 计算所有可能的 BPM 值
    const bpmCandidates = []
    const minInterval = 60 / maxBPM // 最大 BPM 对应的间隔（秒）
    const maxInterval = 60 / minBPM // 最小 BPM 对应的间隔（秒）

    // 计算相邻节拍之间的间隔
    const intervals = []
    for (let i = 1; i < beatPositions.length; i++) {
      const interval = (beatPositions[i] - beatPositions[i - 1]) / sampleRate
      if (interval >= minInterval && interval <= maxInterval) {
        intervals.push(interval)
      }
    }

    // 为每个可能的 BPM 计算得分
    for (let bpm = minBPM; bpm <= maxBPM; bpm += step) {
      const interval = 60 / bpm
      let score = 0

      // 计算与该 BPM 匹配的间隔数量
      intervals.forEach((int) => {
        // 检查是否是该 BPM 的整数倍
        for (let multiple = 0.5; multiple <= 4; multiple *= 2) {
          const tolerance = 0.05 // 5% 的容差
          if (Math.abs(int - interval * multiple) < interval * tolerance) {
            score += 1 / multiple // 倍数越小得分越高
            break
          }
        }
      })

      bpmCandidates.push({ bpm, score })
    }

    return bpmCandidates
  }

  // 选择最佳 BPM
  selectBestBPM(candidates) {
    // 按得分排序
    candidates.sort((a, b) => b.score - a.score)

    // 获取前几个候选值
    const topCandidates = candidates.slice(0, 5)

    // 如果有明显的最高分，则选择它
    if (topCandidates[0].score > topCandidates[1].score * 1.5) {
      return {
        bpm: topCandidates[0].bpm,
        confidence: topCandidates[0].score / candidates.reduce((sum, c) => sum + c.score, 0),
      }
    }

    // 否则，选择最接近常见音乐 BPM 的值
    const commonBPMs = [120, 100, 130, 90, 140]
    let bestBPM = topCandidates[0].bpm
    let minDiff = Infinity

    topCandidates.forEach((candidate) => {
      commonBPMs.forEach((commonBPM) => {
        const diff = Math.abs(candidate.bpm - commonBPM)
        if (diff < minDiff) {
          minDiff = diff
          bestBPM = candidate.bpm
        }
      })
    })

    return {
      bpm: bestBPM,
      confidence: topCandidates[0].score / candidates.reduce((sum, c) => sum + c.score, 0),
    }
  }

  // 基于 BPM 寻找节拍位置
  findBeats(channelData, bpm) {
    const sampleRate = this.sampleRate
    const beatInterval = (60 / bpm) * sampleRate // 节拍间隔（样本数）

    // 计算能量包络
    const bufferSize = 2048
    const hopSize = 512
    const energyEnvelope = this.calculateEnergyEnvelope(channelData, bufferSize, hopSize)

    // 寻找最佳起始点
    const filteredEnvelope = this.highPassFilter(energyEnvelope, 3)
    const { startOffset } = this.findBestStartOffset(filteredEnvelope, beatInterval / hopSize)

    // 生成节拍位置
    const beats = []
    const intervalInHops = beatInterval / hopSize
    let currentBeat = startOffset

    while (currentBeat * hopSize < channelData.length) {
      beats.push(Math.round(currentBeat * hopSize))
      currentBeat += intervalInHops
    }

    return beats
  }

  // 寻找最佳起始偏移
  findBestStartOffset(energyEnvelope, interval) {
    const length = energyEnvelope.length
    const maxOffsets = Math.min(50, Math.floor(length / 4))
    let bestOffset = 0
    let bestScore = 0

    // 尝试不同的起始偏移
    for (let offset = 0; offset < maxOffsets; offset++) {
      let score = 0
      let position = offset

      // 计算该起始点的得分
      while (position < length) {
        score += energyEnvelope[position]
        position += interval
      }

      if (score > bestScore) {
        bestScore = score
        bestOffset = offset
      }
    }

    return { startOffset: bestOffset, score: bestScore }
  }

  // 识别强拍和弱拍
  identifyStrongBeats(channelData, beatPositions, bpm) {
    const { beatsPerBar, strongBeatThreshold } = this.options
    const bufferSize = 2048

    // 计算每个节拍位置的能量
    const beatEnergies = []
    beatPositions.forEach((pos) => {
      const startIdx = Math.max(0, pos - bufferSize / 2)
      const endIdx = Math.min(channelData.length, pos + bufferSize / 2)

      let energy = 0
      for (let i = startIdx; i < endIdx; i++) {
        energy += channelData[i] * channelData[i]
      }

      beatEnergies.push(Math.sqrt(energy / (endIdx - startIdx)))
    })

    // 计算平均能量
    const avgEnergy = beatEnergies.reduce((sum, e) => sum + e, 0) / beatEnergies.length

    // 识别强拍：能量高于阈值，且符合小节结构规律
    const strongBeats = []

    beatPositions.forEach((_, index) => {
      // 1. 检查是否是小节的第一拍位置
      const isBarStart = index % beatsPerBar === 0

      // 2. 检查能量是否高于阈值
      const isHighEnergy = beatEnergies[index] > avgEnergy * strongBeatThreshold

      // 3. 如果符合任一条件，则标记为强拍
      if (isBarStart || isHighEnergy) {
        strongBeats.push(index)
      }
    })

    return { strongBeats }
  }
}

// 导出类（支持 ES6 模块和 CommonJS 模块）
export default BPMDetective
