import {templates, select, settings, classNames} from '../settings.js';
import {utils} from '../utils.js';
import {AmountWidget} from './AmountWidget.js';
import {DatePicker} from './DatePicker.js';
import {HourPicker} from './HourPicker.js';

export class Booking{
  constructor(bookingWrapper){
    const thisBooking = this;
    thisBooking.render(bookingWrapper);
    thisBooking.initWidgets();
    thisBooking.getData();
  }

  render(bookingWrapper){
    const thisBooking = this;
    const generatedHTML = templates.bookingWidget();
    thisBooking.dom = {};
    thisBooking.dom.wrapper = bookingWrapper;
    thisBooking.dom.wrapper.innerHTML = generatedHTML;
    thisBooking.dom.peopleAmount = thisBooking.dom.wrapper.querySelector(select.booking.peopleAmount);
    thisBooking.dom.hoursAmount = thisBooking.dom.wrapper.querySelector(select.booking.hoursAmount);
    thisBooking.dom.datePicker = thisBooking.dom.wrapper.querySelector(select.widgets.datePicker.wrapper);
    thisBooking.dom.hourPicker = thisBooking.dom.wrapper.querySelector(select.widgets.hourPicker.wrapper);
    thisBooking.dom.tables = thisBooking.dom.wrapper.querySelectorAll(select.booking.tables);
  }

  initWidgets(){
    const thisBooking = this;
    thisBooking.peopleAmount = new AmountWidget (thisBooking.dom.peopleAmount);
    thisBooking.hoursAmount = new AmountWidget (thisBooking.dom.hoursAmount);
    thisBooking.datePicker = new DatePicker (thisBooking.dom.datePicker);
    thisBooking.hourPicker = new HourPicker (thisBooking.dom.hourPicker);
    thisBooking.dom.wrapper.addEventListener('updated', function(){
      thisBooking.updateDOM();
    })
  }

  getData(){
    const thisBooking = this;
    const startEndDates = {};
    startEndDates[settings.db.dateStartParamKey] = utils.dateToStr(thisBooking.datePicker.minDate);
    startEndDates[settings.db.dateEndParamKey] = utils.dateToStr(thisBooking.datePicker.maxDate);
    const endDate = {};
    endDate[settings.db.dateEndParamKey] = startEndDates[settings.db.dateEndParamKey];
    const params = {
      booking: utils.queryParams(startEndDates),
      eventsCurrent: settings.db.notRepeatParam + '&' + utils.queryParams(startEndDates),
      eventsRepeat: settings.db.repeatParam + '&' + utils.queryParams(endDate),
    };
    //console.log('getData params', params);
    const urls = {
      booking: settings.db.url + '/' + settings.db.booking + '?' + params.booking,
      eventsCurrent: settings.db.url + '/' + settings.db.event + '?' + params.eventsCurrent,
      eventsRepeat: settings.db.url + '/' + settings.db.event + '?' + params.eventsRepeat,
    };
    //console.log('getData urls', urls);
    Promise.all([
      fetch(urls.booking),
      fetch(urls.eventsCurrent),
      fetch(urls.eventsRepeat),
    ])
      .then(function([bookingsResponse, eventsCurrentResponse, eventsRepeatResponse]){
        return Promise.all([
          bookingsResponse.json(),
          eventsCurrentResponse.json(),
          eventsRepeatResponse.json(),
        ]);
      })
      .then(function([bookings, eventsCurrent, eventsRepeat]){
        thisBooking.parseData(bookings, eventsCurrent, eventsRepeat);
      });
  }

  parseData(bookings, eventsCurrent, eventsRepeat){
    const thisBooking = this;
    thisBooking.booked = {};
    for(let item of bookings){
      //console.log('Bookings: ', item);
      thisBooking.makeBooked(item.date, item.hour, item.duration, item.table);
    }
    for(let item of eventsCurrent){
      //console.log('CurrentEvents: ', item);
      thisBooking.makeBooked(item.date, item.hour, item.duration, item.table);
    }
    const minDate = thisBooking.datePicker.minDate;
    const maxDate = thisBooking.datePicker.maxDate;
    for(let item of eventsRepeat){
      //console.log('RepeatEvents: ', item);
      if(item.repeat == 'daily'){
        for(let loopDate = minDate; loopDate <= maxDate; loopDate = utils.addDays(loopDate, 1)){
          thisBooking.makeBooked(utils.dateToStr(loopDate), item.hour, item.duration, item.table);
        }

      }
    }
    console.log('Bookings: ', thisBooking.booked);
    thisBooking.updateDOM();
  }

  makeBooked(date, hour, duration, table){
    const thisBooking = this;
    if (typeof thisBooking.booked[date] == 'undefined') {
      thisBooking.booked[date] = {};
    }
    const startHour = utils.hourToNumber(hour);
    const blockHour = 0.5;
    const endHour = startHour + duration - blockHour;
    let bookedHours = startHour;
    for (
      let bookedHours = startHour;
      bookedHours < startHour + duration;
      bookedHours += 0.5
    ) {
      if (typeof thisBooking.booked[date][bookedHours] == 'undefined') {
        thisBooking.booked[date][bookedHours] = [];
      }
      thisBooking.booked[date][bookedHours].push(table);
    }
  }

  updateDOM(){
    const thisBooking = this;
    console.log(thisBooking);
    thisBooking.date = thisBooking.datePicker.correctValue;
    console.log(thisBooking.date);
    thisBooking.hour = utils.hourToNumber(thisBooking.hourPicker.value);
    console.log(thisBooking.hour);
    for(let table of thisBooking.dom.tables){
      let tableID = table.getAttribute(settings.booking.tableIdAttribute);
      //console.log(tableID);
      if(thisBooking.booked[thisBooking.date][thisBooking.hour].includes(tableID)){
        table.classList.add(classNames.booking.tableBooked);
      }
      else{
        table.classList.remove(classNames.booking.tableBooked);
      }
    }
  }

}
