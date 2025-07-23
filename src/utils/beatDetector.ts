/**
 * 原始节拍候选信息
 */
export interface BeatCandidate {
  time: number // 节拍时间（秒）
  position: number // 节拍在音频中的样本位置
  energy: number // 节拍能量值
}

/**
 * 音乐风格类型
 */
export enum MusicStyle {
  DEFAULT = 'default',
  RHYTHMIC = 'rhythmic',
  FREE = 'free',
  LOW_ENERGY = 'low_energy',
}

/**
 * 节拍检测器配置
 */
export interface BeatDetectorOptions {
  minPeakDistance?: number
  peakSensitivity?: number
  bufferSize?: number
  hopSize?: number
  style?: MusicStyle
  minEnergyThreshold?: number
  weakBeatFilter?: boolean // 新增：是否过滤低能量弱拍
}

/**
 * 节拍检测器（优化弱拍检测，减少冗余）
 */
export class BeatDetector {
  private audioBuffer: AudioBuffer
  private sampleRate: number
  private options: Required<BeatDetectorOptions>

  constructor(audioBuffer: AudioBuffer, options: BeatDetectorOptions = {}) {
    this.audioBuffer = audioBuffer
    this.sampleRate = audioBuffer.sampleRate

    this.options = {
      minPeakDistance: 500,
      peakSensitivity: 1.3,
      bufferSize: 2048,
      hopSize: 256,
      style: MusicStyle.DEFAULT,
      minEnergyThreshold: 0.008,
      weakBeatFilter: true, // 默认开启弱拍过滤
      ...options,
    }

    // 低能量音频适配
    if (this.options.style === MusicStyle.LOW_ENERGY) {
      this.options.bufferSize = 1024
      this.options.hopSize = 128
      this.options.peakSensitivity = 1.5
      this.options.minEnergyThreshold = 0.005
      this.options.minPeakDistance = 400
    }
  }

  /**
   * 检测音频中的原始节拍候选（过滤低能量弱拍）
   */
  detectCandidates(): BeatCandidate[] {
    const channelData = this.getMonoChannelData()
    const energyEnvelope = this.calculateEnergyEnvelope(channelData)
    const filteredEnvelope = this.filterEnvelope(energyEnvelope)
    const peakPositions = this.findPeakPositions(filteredEnvelope)

    let candidates = peakPositions.map((pos) => {
      const samplePos = pos * this.options.hopSize
      return {
        time: parseFloat((samplePos / this.sampleRate).toFixed(2)),
        position: samplePos,
        energy: this.calculatePeakEnergy(channelData, samplePos),
      }
    })

    // 过滤低能量弱拍（仅保留能量高于阈值的候选）
    if (this.options.weakBeatFilter) {
      const energyThreshold = this.calculateWeakBeatFilterThreshold(candidates)
      candidates = candidates.filter((c) => c.energy >= energyThreshold)
    }

    return candidates
  }

  /**
   * 计算弱拍过滤的能量阈值（过滤掉能量最低的20%）
   */
  private calculateWeakBeatFilterThreshold(candidates: BeatCandidate[]): number {
    if (candidates.length === 0) return 0
    const sortedEnergies = [...candidates.map((c) => c.energy)].sort((a, b) => a - b)
    const thresholdIndex = Math.floor(sortedEnergies.length * 0.2) // 保留前80%
    return sortedEnergies[thresholdIndex] || this.options.minEnergyThreshold
  }

  /**
   * 将音频转换为单声道
   */
  private getMonoChannelData(): Float32Array {
    const { numberOfChannels, length } = this.audioBuffer
    if (numberOfChannels === 1) {
      return this.audioBuffer.getChannelData(0)
    }

    const monoData = new Float32Array(length)
    for (let i = 0; i < length; i++) {
      let sum = 0
      for (let c = 0; c < numberOfChannels; c++) {
        sum += this.audioBuffer.getChannelData(c)[i]
      }
      monoData[i] = sum / numberOfChannels
    }
    return monoData
  }

  /**
   * 计算音频能量包络
   */
  private calculateEnergyEnvelope(channelData: Float32Array): number[] {
    const { bufferSize, hopSize, style } = this.options
    const envelope: number[] = []

    for (let i = 0; i < channelData.length - bufferSize; i += hopSize) {
      let energy = 0
      for (let j = 0; j < bufferSize; j++) {
        energy += Math.pow(channelData[i + j], 2)
      }
      const rms = Math.sqrt(energy / bufferSize)
      envelope.push(style === MusicStyle.LOW_ENERGY ? rms ** 1.5 : rms)
    }

    return envelope
  }

  /**
   * 过滤能量包络
   */
  private filterEnvelope(envelope: number[]): number[] {
    return this.options.style === MusicStyle.LOW_ENERGY
      ? this.softHighPassFilter(envelope)
      : this.highPassFilter(envelope)
  }

  /**
   * 高通滤波
   */
  private highPassFilter(data: number[]): number[] {
    const filtered = [...data]
    for (let i = 1; i < filtered.length; i++) {
      filtered[i] = filtered[i] - 0.97 * filtered[i - 1]
    }
    return filtered.map((v) => Math.max(0, v))
  }

  /**
   * 软高通滤波（低能量音频专用）
   */
  private softHighPassFilter(data: number[]): number[] {
    const filtered = [...data]
    for (let i = 1; i < filtered.length; i++) {
      filtered[i] = filtered[i] - 0.8 * filtered[i - 1]
    }
    return filtered.map((v) => Math.max(0, v))
  }

  /**
   * 从能量包络中找到峰值位置（提高阈值，减少弱拍）
   */
  private findPeakPositions(envelope: number[]): number[] {
    const { minPeakDistance, peakSensitivity } = this.options
    const minSampleDistance = Math.floor(
      ((minPeakDistance / 1000) * this.sampleRate) / this.options.hopSize
    )
    const threshold = this.calculatePeakThreshold(envelope)

    const peaks: number[] = []
    for (let i = 1; i < envelope.length - 1; i++) {
      // 提高峰值判断门槛，减少弱峰
      const isSignificantPeak =
        envelope[i] > envelope[i - 1] * (1 + peakSensitivity * 0.15) &&
        envelope[i] > envelope[i + 1] * (1 + peakSensitivity * 0.15) &&
        envelope[i] > threshold

      if (
        isSignificantPeak &&
        (peaks.length === 0 || i - peaks[peaks.length - 1] > minSampleDistance)
      ) {
        peaks.push(i)
      }
    }

    return peaks
  }

  /**
   * 计算峰值检测的阈值（提高阈值，减少弱拍）
   */
  private calculatePeakThreshold(envelope: number[]): number {
    const sorted = [...envelope].sort((a, b) => b - a)
    const topPercent = this.options.weakBeatFilter ? 0.2 : 0.3 // 过滤模式下取前20%
    const topValue = sorted[Math.floor(sorted.length * topPercent)] || 0
    return topValue * (this.options.weakBeatFilter ? 0.6 : 0.5) // 提高阈值系数
  }

  /**
   * 计算峰值位置的能量值
   */
  private calculatePeakEnergy(channelData: Float32Array, samplePos: number): number {
    const windowSize = this.options.style === MusicStyle.LOW_ENERGY ? 512 : 1024
    const start = Math.max(0, samplePos - windowSize / 2)
    const end = Math.min(channelData.length, samplePos + windowSize / 2)
    let energy = 0

    for (let i = start; i < end; i++) {
      energy += Math.abs(channelData[i])
    }

    return energy / (end - start)
  }
}

export default BeatDetector
