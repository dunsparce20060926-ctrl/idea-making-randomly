export interface Grain {
  id: string
  text: string
  note?: string
  createdAt: number
  updatedAt: number
}

export interface Box {
  id: string
  name: string
  color?: string
  description?: string
  createdAt: number
  updatedAt: number
}

/** 箱と粒の対応（多対多）。同じ粒が複数の箱に入り得る */
export interface BoxGrain {
  boxId: string
  grainId: string
}

/** 組み合わせの1要素 */
export interface Slot {
  /** どの箱から引くか。粒を直接固定した場合は null */
  boxId: string | null
  grainId: string | null
  /** 粒が後で編集・削除されても保存時の内容を残す */
  grainTextSnapshot?: string
  anchored: boolean
}

export interface SavedIdea {
  id: string
  slots: Slot[]
  memo: string
  createdAt: number
  updatedAt: number
}
