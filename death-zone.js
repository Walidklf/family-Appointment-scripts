
const global = unsafeWindow

function matchPath (pattern, pathname = location.pathname) {
  return compileMatcher(pattern).test(pathname)

  function compileMatcher (pattern) {
    const source =
        '^'
        + pattern
          .replace(/\/*$/, '') // Ignore trailing /, we'll handle it below
          .replace(/^\/*/, '/') // Make sure it has a leading /
          .replaceAll(/[\\.*+^${}|()[\]]/g, '\\$&') // Escape special regex chars
        + '\/*$'
    return new RegExp(source, 'i')
  }
}

function shuffleArray (array) {
  let index = -1
  const length = array.length
  const lastIndex = length - 1
  while (++index < length) {
    const rand = random(index, lastIndex)
    ;[array[index], array[rand]] = [array[rand], array[index]]
  }
  return array
}

function random (lower, upper) { return lower + Math.floor(Math.random() * (upper - lower + 1)) }

class LoginBot {
  start () {
    console.log(`${this.constructor.name} started`)

    this.#hidePreloader()
    this.#makeLoaderDismissable()
    this.#removeRandomnessFromUi()
    this.#enableCopyPasteInInputs()
    this.#setReturnUrl()
    this.#injectLoginFeature()
    this.#injectProfilePhotoUploadFeature()

  }

  #hidePreloader () { $('.preloader').hide() }

  #makeLoaderDismissable () {
    $(`
      <button class="btn btn-secondary position-absolute top-50 start-50 translate-middle-x mt-5"
              onclick="window.HideLoader();">
        Hide Loader</button>
    `).appendTo('.global-overlay-loader')
  }

  #removeRandomnessFromUi () {
    // Center main content
    $('#div-main > .container > .row > [class^=col-]').hide()
    $('#div-main > .container > .row > :has(form)').addClass('mx-auto')

    // Remove random top padding
    $(':has(> form)').removeAttr('class')
  }

  #enableCopyPasteInInputs () { $('.entry-disabled:visible').on('copy paste', evt => evt.stopImmediatePropagation()) }

  #setReturnUrl () { $('#ReturnUrl').val($('.new-app-active').attr('href')) }

  #injectLoginFeature () {
    $(`
      <select id="_applicants" class="form-select form-select-lg mt-2">
        <option selected disabled>Select a User</option>
        ${applicants.map(({ name, mail }) => `<option value="${mail}">${name || mail}</option>`)}
      </select>
    `)
      .insertAfter('.text-center:has(img[alt=logo])')
      .on('change', () => this.#fillForm())
  }

  #fillForm () {
    const selectedMail = $('#_applicants').val()
    const applicant = applicants.find(({ mail }) => mail === selectedMail)

    $(':text[name]:visible').val(applicant?.mail)
    applicant?.profilePhotoId && $('#_profilePhoto').attr('src', `/MAR/query/getfile?fileid=${applicant.profilePhotoId}`)
    ;/on|true/.test(autoSubmitForms?.login) && $('#btnVerify').trigger('click')
  }

  #injectProfilePhotoUploadFeature () {
    $(`
      <div class="vstack align-items-center gap-2">
        <img id="_profilePhoto" class="img-thumbnail object-fit-cover" src="/assets/images/avatar/01.jpg"
             style="width: 128px; height: 128px;">
        <div class="input-group input-group-sm flex-nowrap">
          <input id="_profilePhotoId" class="form-control" placeholder="No photo uploaded yet" readonly>
          <button id="_copyProfilePhotoId" class="btn btn-secondary"><i class="bi bi-clipboard"></i></button>
        </div>
        <label id="_uploadProfilePhotobtn" class="btn btn-sm btn-secondary">
          <span>Upload Profile Photo</span>
          <span class="text-warning-emphasis" hidden>
            <span class="spinner-grow spinner-grow-sm align-text-top"></span> Uploading ...
          </span>
          <input id="_profilePhotoFile" type="file" hidden>
        </label>
        <style>
          #_uploadProfilePhotobtn.disabled {
            > :first-child { display: none; }
            > :nth-child(2) { display: unset !important; }
          }
        </style>
      </div>
    `)
      .insertAfter('.text-center:has(img[alt=logo])')
      .on('change', '#_profilePhotoFile', () => this.#uploadProfilePhoto())
      .on('click', '#_copyProfilePhotoId', () => this.#copyProfilePhotoId())
  }

  #uploadProfilePhoto () {
    const target = $('#_profilePhotoFile')

    const [file] = target.prop('files')
    file && $.post({
      url: '/MAR/query/UploadProfileImage',
      contentType: false,
      processData: false,
      timeout: 30_000,
      beforeSend () {
        this.data = new FormData()
        this.data.append('file', file)
        $('#_uploadProfilePhotobtn').addClass('disabled')
      },
      success (result) {
        if (result.success) {
          $('#_profilePhotoId').val(result.fileId)
          $('#_profilePhoto').attr('src', `/MAR/query/getfile?fileid=${result.fileId}`)
        } else {
          global.ShowError(result.err)
        }
      },
      error (xhr, type) {
        global.ShowError(`Failed to upload profile photo. ${type} (${xhr.status}).`)
      },
      complete () {
        $('#_uploadProfilePhotobtn').removeClass('disabled')
        target.val(undefined)
      }
    })
  }

  #copyProfilePhotoId () {
    const profilePhotoId = $('#_profilePhotoId').val()
    profilePhotoId && navigator.clipboard.writeText(profilePhotoId)
      .then(() => alert(`Profile photo id "${profilePhotoId}" have been copied to the clipboard.`))
      .catch(err => console.error('Failed to write to the clipboard.', err))
  }
}

class LoginCaptchaBot {
  start () {
    console.log(`${this.constructor.name} started`)

    this.#makeLoaderDismissableAndTranslucent()
    this.#removeRandomnessFromUi()
    this.#enableCopyPasteInInputs()
    const applicant = this.#getActiveApplicant()
    this.#markTabWithCurrentUser(applicant)
    this.#setPassword(applicant)
    this.#solveCaptcha()
  }

  #makeLoaderDismissableAndTranslucent () {
    $(`
      <button class="btn btn-secondary position-absolute" onclick="window.HideLoader();"
              style="top: 50%; margin-inline-start: 50%; transform: translate(-50%, calc(100% + 1rem));">
        Hide Loader</button>
    `).appendTo('.global-overlay-loader')
    $('.global-overlay').css('background-color', 'rgba(0 0 0 / 30%)')
  }

  #removeRandomnessFromUi () {
    // Center main content
    $('body > .row > [class^=col-]').hide()
    $('body > .row > :has(form)').addClass('mx-auto')

    // Reorder elements
    $('#captcha-main-div').addClass('d-flex flex-column')
    $('#captcha-main-div > .pwd-div:has(form)').addClass('order-0').css({ height: 'auto' })
    $('#captcha-main-div > .main-div-container').addClass('order-1')
    $('#captcha-main-div > .pwd-div:not(:has(*))').hide()
  }

  #enableCopyPasteInInputs () { $('.entry-disabled:visible').off('copy paste') }

  #getActiveApplicant () {
    const activemail = $(':contains(Email:) > b').text()
    return applicants.find(({ mail }) => mail === activemail)
  }

  #markTabWithCurrentUser (applicant) {
    applicant?.name && (document.title = applicant.name)
    applicant?.profilePhotoId && $('img[alt=logo]')
      .addClass('img-thumbnail')
      .css({ width: '128px', height: '128px', objectFit: 'cover' })
      .attr('src', `/MAR/query/getfile?fileid=${applicant.profilePhotoId}`)
  }

  #setPassword (applicant) { $(':password:visible').val(applicant?.password) }

  #solveCaptcha() {
    if (!(/on|true/.test(captcha.enabled) && captcha.apiKey)) return

    const target = this.#getCaptchaTarget()
    const grid = this.#getCaptchaGrid()

    const extractCaptchaGridData = grid => Object.fromEntries(grid.map(img => img.src).entries())

    const onSuccess = result => {
      if (result.status === 'solved') {
        // Apply solution
        Object.entries(result.solution).forEach(([index, value]) => value === target && grid[index].click())
        // Auto submit
        ;/on|true/.test(autoSubmitForms?.loginCaptcha) && $('#btnVerify').trigger('click')
      } else {
        onError('captchaerror', result)
      }
    }
    const onError = (type, data) => {
      console.error(type, data)
      $('.validation-summary-valid').html('<b>Failed to solve captcha.</b>')
    }

		$.post({
			url: 'https://pro.nocaptchaai.com/solve',
			headers: { apiKey: captcha.apiKey },
			contentType: 'application/json',
			dataType: 'json',
			data: JSON.stringify({
				method: 'ocr',
				id: 'morocco',
				images: extractCaptchaGridData(grid),
			}),
      timeout: 30_000,
      beforeSend () {
        this._loading = $(`
          <div class="d-flex align-items-center justify-content-center lead text-warning">
            <span class="spinner-grow"></span>
            &nbsp;Solving captcha ...
          </div>
        `).prependTo('.main-div-container')
      },
			complete (xhr, state) {
				this._loading?.remove()

				switch (state) {
					case 'success':
						onSuccess(xhr.responseJSON)
						break
					case 'error':
					case 'parsererror':
						onError(state, xhr)
						break
				}
			},
		})
  }

  #getCaptchaTarget () {
    return $('.box-label')
      .sort((a, b) => getComputedStyle(b).zIndex - getComputedStyle(a).zIndex)
      .first()
      .text()
      .replace(/\D+/, '')
  }

  #getCaptchaGrid () {
    // From top-to-bottom and left-to-right
    return $(':has(> .captcha-img):visible').get()
      // Group by top position
      .reduce((acc, cur) => {
        (acc[Math.floor(cur.offsetTop)] ??= []).push(cur)
        return acc
      }, [])
      .flatMap(sortedByTop => {
        const sortedByZIndex = sortedByTop.sort((a, b) => getComputedStyle(b).zIndex - getComputedStyle(a).zIndex)
        const top3 = sortedByZIndex.slice(0, 3) // max cells
        const sortedByLeft = top3.sort((a, b) => a.offsetLeft - b.offsetLeft)
        return sortedByLeft
      })
      .map(element => element.firstElementChild)
  }
}

class AppointmentCaptchaBot {
  start () {
    console.log(`${this.constructor.name} started`)

    this.#hidePreloader()
    this.#makeLoaderDismissable()
    this.#removeRandomnessFromUi()
    this.#solveCaptcha()
  }

  #hidePreloader () { $('.preloader').hide() }

  #makeLoaderDismissable () {
    $(`
      <button class="btn btn-secondary position-absolute top-50 start-50 translate-middle-x mt-5"
              onclick="window.HideLoader();">
        Hide Loader</button>
    `).appendTo('.global-overlay-loader')
  }

  #removeRandomnessFromUi () {
    // Center main content
    $('.row:has(> .captcha-div) > [class^=col-]').hide()
    $('.captcha-div').addClass('mx-auto')
  }

  #solveCaptcha () {
    if (!(/on|true/.test(captcha.enabled) && captcha.apiKey)) return

    const target = this.#getCaptchaTarget()
    const grid = this.#getCaptchaGrid()

    const extractCaptchaGridData = grid => Object.fromEntries(grid.map(img => img.src).entries())

    const onSuccess = result => {
      if (result.status === 'solved') {
        // Apply solution
        Object.entries(result.solution).forEach(([index, value]) => value === target && grid[index].click())
        // Auto submit
        ;/on|true/.test(autoSubmitForms?.appointmentCaptcha) && $('#btnVerify').trigger('click')
      } else {
        onError('captchaerror', result)
      }
    }
    const onError = (type, data) => {
      console.error(type, data)
      $('.validation-summary-valid').html('<b>Failed to solve captcha.</b>')
    }

		$.post({
			url: 'https://pro.nocaptchaai.com/solve',
			headers: { apiKey: captcha.apiKey },
			contentType: 'application/json',
			dataType: 'json',
			data: JSON.stringify({
				method: 'ocr',
				id: 'morocco',
				images: extractCaptchaGridData(grid),
			}),
      timeout: 30_000,
      beforeSend () {
        this._loading = $(`
          <div class="d-flex align-items-center justify-content-center lead text-warning">
            <span class="spinner-grow"></span>
            &nbsp;Solving captcha ...
          </div>
        `).prependTo('.main-div-container')
      },
			complete (xhr, state) {
				this._loading?.remove()

				switch (state) {
					case 'success':
						onSuccess(xhr.responseJSON)
						break
					case 'error':
					case 'parsererror':
						onError(state, xhr)
						break
				}
			},
		})
  }

  #getCaptchaTarget () {
    return $('.box-label')
      .sort((a, b) => getComputedStyle(b).zIndex - getComputedStyle(a).zIndex)
      .first()
      .text()
      .replace(/\D+/, '')
  }

  #getCaptchaGrid () {
    // From top-to-bottom and left-to-right
    return $(':has(> .captcha-img):visible').get()
      // Group by top position
      .reduce((acc, cur) => {
        (acc[Math.floor(cur.offsetTop)] ??= []).push(cur)
        return acc
      }, [])
      .flatMap(sortedByTop => {
        const sortedByZIndex = sortedByTop.sort((a, b) => getComputedStyle(b).zIndex - getComputedStyle(a).zIndex)
        const top3 = sortedByZIndex.slice(0, 3) // max cells
        const sortedByLeft = top3.sort((a, b) => a.offsetLeft - b.offsetLeft)
        return sortedByLeft
      })
      .map(element => element.firstElementChild)
  }
}

class VisaTypeBot {
  #applicant

  start () {
    console.log(`${this.constructor.name} started`)

    this.#hidePreloader()
    this.#makeLoaderDismissable()
    this.#applicant = this.#getActiveApplicant()
    this.#fillForm()

    $(() => {
      // Show selected value in dropdowns
      ;['Category', 'Location', 'Visa Type', 'Visa Sub Type'].forEach(label => {
        const ddl = $(`.form-label:visible:contains(${label}) + .k-widget > :text`)
          .data('kendoDropDownList')
        ddl.value(ddl.value())
      })

      // Remove randomness from UI
      // Center main content
      $('#div-main > div:is(:first-child, :last-child)')
          .removeClass()
          .hide()
      $('#div-main > :has(form)').addClass('mx-auto')

      // Reorder elements
      $('form > div:nth-child(2)')
        .addClass(['vstack',  'gap-4'])
        .children('div')
        .removeClass((_, className) => className.match(/m[tb]-\d/g)) // Remove random vertical margin
      ;['Appointment For', 'Category', 'Location', 'Visa Type', 'Visa Sub Type'].forEach((label, idx) => {
        $(`div:has(> .form-label:contains(${label})):visible`)
          .addClass(`order-${idx}`)
      })
      $('div:has(> #btnSubmit)').addClass('order-5')
    })
  }

  #hidePreloader () { $('.preloader').hide() }

  #makeLoaderDismissable () {
    $(`
      <button class="btn btn-secondary position-absolute top-50 start-50 translate-middle-x mt-5"
              onclick="window.HideLoader();">
        Hide Loader</button>
    `).appendTo('.global-overlay-loader')
  }

  #getActiveApplicant () {
    const activeMail = $('.avatar + > p.small').text()
    return applicants.find(({ mail }) => mail === activeMail)
  }

  #fillForm () {
    // Fill applicant type and count
    const applCount = this.#applicant?.applicantCount || 1
    const applCategory = applCount > 1 ? 'Family' : 'Individual'
    const apptFor = $(':radio:visible')
        .filter(`[value="${applCategory}"]`)
        .prop('checked', true)
    if (applCategory === 'Family') {
      $('#AppointmentFor').val(applCategory)
      const idPostfix = apptFor.prop('id').substring(applCategory.length)
      $(`#members${idPostfix}`)
        .show()
        .children(':text')
        .val(global.applicantsNoData.find(it => it.Name.startsWith(applCount))?.Value)
    }

    // Fill appointment category
    const normalizedCat = {
        n: 'Normal', normal: 'Normal',
        pm: 'Premium', premium: 'Premium',
        pt: 'Prime Time', primetime: 'Prime Time',
    }[this.#applicant?.category?.toLowerCase() || 'normal']
    const selectedCategoryId = global.categoryData
        .find(it => it.Name === normalizedCat)
        ?.Id
    $('.form-label:visible:contains(Category) + :text').val(selectedCategoryId)

    // Fill location
    const normalizedLoc = {
        tet: 'Tetouan', tetouan: 'Tetouan',
        nad: 'Nador', nador: 'Nador',
        aga: 'Agadir', agadir: 'Agadir',
        rab: 'Rabat', rabat: 'Rabat',
        tan: 'Tangier', tangier: 'Tangier',
        cas: 'Casablanca', casablanca: 'Casablanca',
    }[this.#applicant?.location?.toLowerCase()]
    const selectedLoc = global.locationData
        .find(it => it.Name === normalizedLoc)
    $('.form-label:visible:contains(Location) + :text').val(selectedLoc?.Id)

    // Fill visa subtype
    const normalizedVisaSubtype = {
        sch: 'Schengen Visa', schengen: 'Schengen Visa',
        std: 'Student Visa', student: 'Student Visa',
        famr: 'Family Reunification Visa', familyreunification: 'Family Reunification Visa',
        nat: 'National Visa', national: 'National Visa',
        work: 'Work Visa',
        c1: 'Casa 1', casa1: 'Casa 1',
        c2: 'Casa 2', casa2: 'Casa 2',
        c3: 'Casa 3', casa3: 'Casa 3',
    }[this.#applicant?.visa?.toLowerCase()]
    const selectedVisaSubtype = global.visasubIdData
        .find(it => it.Name === normalizedVisaSubtype)
    $('.form-label:visible:contains(Visa Sub Type) + :text').val(selectedVisaSubtype?.Id)
    $('#DataSource').val(selectedVisaSubtype.Code)

    // Fill visa type
    const selectedVisaType = global.visaIdData
        .find(it => it.Id === selectedVisaSubtype?.Value)
    $('.form-label:visible:contains(Visa Type) + :text').val(selectedVisaType?.Id)

    // Set global variables
    global.visaTypeFilterData = global.visaIdData
      .filter(it => selectedLoc?.VisaTypeIds.includes(it.Id))
    global.visasubIdFilterData = global.visasubIdData
      .filter(it => {
        return it.Value === selectedVisaType.Id
          && (selectedLoc?.VisaSubTypeIds?.includes(it.Id) ?? true)
      })

    ;/on|true/.test(autoSubmitForms?.visaType) && $('#btnSubmit').trigger('click')
  }
}

class SlotSelectionBot {
  start () {
    console.log(`${this.constructor.name} started`)

    this.#hidePreloader()
    this.#makeLoaderDismissable()
    this.#removeRandomnessFromUi()
    Object.assign(global, {
      OnAppointmentdateChange: () => this.#getAvailableSlotTimes(),
    })
    this.#selectSlot()
  }

  #hidePreloader () { $('.preloader').hide() }

  #makeLoaderDismissable () {
    $(`
      <button class="btn btn-secondary position-absolute top-50 start-50 translate-middle-x mt-5"
              onclick="window.HideLoader();">
        Hide Loader</button>
    `).appendTo('.global-overlay-loader')
  }

  #removeRandomnessFromUi () {
    // Center main content
    $('#div-main > :is(:first-child, :last-child)').removeClass().hide()
    $('#div-main > :has(form)').addClass('mx-auto')

    // Remove random vertical margin
    $('form > div:nth-child(2)')
      .addClass('gap-4')
      .children('div')
      .removeClass((_, className) => className.match(/m[tb]-\d/g))

    $('div:has(> #btnSubmit)').addClass('mt-5')
  }

  #selectSlot () {
    $(() => {
      const allowedDates = global.availDates.ad.filter(it => it.AppointmentDateType === 0)
      const selectedDate = shuffleArray(allowedDates).at(random(0, allowedDates.length - 1))
      if (selectedDate) {
          const datePicker = $('.k-datepicker:visible .k-input').data('kendoDatePicker')
          datePicker.value(selectedDate.DateText)
          datePicker.trigger('change')
      }
    })
  }

  #getAvailableSlotTimes () {
    const apptDate = $('.k-datepicker:visible .k-input').val()
    const slotDropDown = $('.k-dropdown:visible > .form-control').data('kendoDropDownList')
    if (!apptDate) {
      slotDropDown.value(undefined)
      slotDropDown.setDataSource([])
      // slotDropDown.enable(false)
      return false
    }
    global.ShowLoader()
    const that = this
    $.ajax({
      type: 'POST',
      url: `/MAR/appointment/GetAvailableSlotsByDate?data=${encodeURIComponent(new URLSearchParams(location.search).get('data'))}&appointmentDate=${apptDate}`,
      dataType: 'json',
      success (data) {
        if (data.success) {
          that.#selectSlotTime(global.slotDataSource = data.data)
        } else {
          global.ShowError(data.err)
          data.ru && global.confirm(`You will be redirected to: ${data.ru}`) && global.location.replace(data.ru)
        }
      },
      complete () {
        global.HideLoader()
      }
    })
  }

  #selectSlotTime (slots) {
    const availableSlots = slots.filter(s => s.Count > 0)
    let selectedSlot = shuffleArray(availableSlots).at(random(0, availableSlots.length - 1))
    availableSlots.forEach(s => s.Count > selectedSlot.Count && (selectedSlot = s))
    if (selectedSlot) {
      speechSynthesis.speak(new SpeechSynthesisUtterance('Rendez-vous mafia disponible !!!'))

      const slotDropDown = $('.k-dropdown:visible > .form-control').data('kendoDropDownList')
      slotDropDown.setDataSource(slots)
      slotDropDown.value(selectedSlot.Id)

      ;/on|true/.test(autoSubmitForms?.slotSelection) && $(() => $('#btnSubmit').trigger('click'))
    }
  }
}

class ApplicantSelectionBot {
  start () {
    console.log(`${this.constructor.name} started`)

    // debugger

    // Disable unnecessary dialogs
    $('.modal:not(#logoutModal)').on('show.bs.modal', evt => evt.preventDefault())

    this.#hidePreloader()
    this.#makeLoaderDismissable()
    this.#removeRandomnessFromUi()

    const applicant = this.#getActiveApplicant()

    // Set applicant photo
      applicant?.profilePhotoId &&
        $('#ApplicantPhotoId').val(applicant.profilePhotoId),
        $('#uploadfile-1-preview').attr('src', `/MAR/query/getfile?fileid=${applicant.profilePhotoId}`)

    // Select applicant
    $('div[id^=app-]').first().trigger('click')

    // Monitor OTP
    this.#remonitorOtp()

    $(() => {
      // Set travel date
      const oneMonthLater = new Date()
      oneMonthLater.setMonth(oneMonthLater.getMonth() + 1)
      $('#TravelDate').data('kendoDatePicker').value(oneMonthLater)

      $('#EmailCode')
        .prop('oncopy', null)
        .prop('onpaste', null)
    })
  }

  #hidePreloader () { $('.preloader').hide() }

  #makeLoaderDismissable () {
    $(`
      <button class="btn btn-secondary position-absolute top-50 start-50 translate-middle-x mt-5"
              onclick="window.HideLoader();">
        Hide Loader</button>
    `).appendTo('.global-overlay-loader')
  }

  #removeRandomnessFromUi () {
    // Center main content
    $('#div-main > :is(:first-child, :last-child)').removeClass().hide()
    $('#div-main > :has(form)')
      .removeClass((_, className) => className.match(/col-(?:sm|md)-\d/g))
      .addClass(['col-md-6', 'mx-auto'])
  }

  #getActiveApplicant () {
    const activeMail = $('.avatar + > p.small').text()
    return applicants.find(({ mail }) => mail === activeMail)
  }

  #remonitorOtp () {
    const stop = () => {
      $(':is(.spinner-grow, .bi-check-lg):has(+ #EmailCode)').remove()
      GM_removeValueChangeListener(this._fetchOtpListenerId)
      GM_setValue('ezbook_otp')
    }

    stop()
    $('<span class="spinner-grow spinner-grow-sm text-primary ms-2"></span>').insertBefore('#EmailCode')
    this._fetchOtpListenerId = GM_addValueChangeListener('ezbook_otp', (_name, _prev, otp, remote) => {
      if (remote && otp) {
        stop()
        $('#EmailCode').val(otp)
        $('<i class="bi bi-check-lg text-success"></i>').insertBefore('#EmailCode')
        ;/on|true/.test(autoSubmitForms?.applicantSelection)
          && $('#btnSubmit').trigger('click')
      }
    })
  }
}

class GmailBot {
	install() {
		setInterval(() => this.#displayUnreadEmails(), 250)
	}

	#displayUnreadEmails() {
		const emails = document.querySelectorAll('.zE');
		if (emails.length > 0) {
			for (let i = 0; i < 3; i++) {
				const email = emails[i];
				const subject = email.querySelector('.bA4 span').textContent;
				if (/blsspainglobal|blsinternation/.test(subject)) {
					email.click();
					email.classList.remove('zE');
					setTimeout(() => this.#extractEmailContent(), 500);
					break;
				}
			}
		}
	}

	#extractEmailContent() {
		const emailBody = document.querySelector('.a3s');
		if (emailBody) {
			const content = emailBody.innerHTML;
			if (content) {
				const codeMatch = content.match(/\b(\d{6})\b/);
				if (codeMatch) {
					const code = codeMatch[1];
          GM_setValue('ezbook_otp', code)
					console.log('Found OTP', code)
					const closeButton = document.querySelector('.nU.n1');
					if (closeButton) {
						closeButton.click();
					}
				}
			}
		}
	}
}

if (location.hostname === 'www.blsspainmorocco.net') {
  switch (true) {
    case matchPath('/MAR/account/login'):
      new LoginBot().start()
      break

    case matchPath('/MAR/newcaptcha/logincaptcha'):
      new LoginCaptchaBot().start()
      break

    case matchPath('/MAR/Appointment/AppointmentCaptcha'):
      new AppointmentCaptchaBot().start()
      break

    case matchPath('/MAR/Appointment/VisaType'):
      new VisaTypeBot().start()
      break

    case matchPath('/MAR/Appointment/SlotSelection'):
      new SlotSelectionBot().start()
      break

    case matchPath('/MAR/Appointment/ApplicantSelection'):
      new ApplicantSelectionBot().start()
      break

    // /MAR/appointment/livenessrequest
  }
}  else if (location.hostname === 'mail.google.com') {
  new GmailBot().install()
}
