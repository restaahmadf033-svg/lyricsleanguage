import type { Request, Response } from 'express'
import app from '../server/index'

export default function analyze(request: Request, response: Response) {
  request.url = '/'
  return app(request, response)
}
