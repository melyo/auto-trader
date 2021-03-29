require('dotenv').config()
const { ToadScheduler, SimpleIntervalJob, AsyncTask } = require('toad-scheduler')

const trade = require('./src/cron-trade')

const scheduler = new ToadScheduler()
const task = new AsyncTask('auto-trade', trade)
const job = new SimpleIntervalJob({ seconds: 5 }, task)
scheduler.addSimpleIntervalJob(job)
