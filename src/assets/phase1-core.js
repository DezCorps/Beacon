(function () {
  'use strict';

  function currentPage() {
    const path = window.location.pathname || '';
    const parts = path.split('/');
    return parts[parts.length - 1] || '';
  }

  function isAdminUser() {
    const explicit = localStorage.getItem('beacon_is_admin');
    if (explicit === '1') return true;
    if (explicit === '0') return false;

    const role = String(localStorage.getItem('beacon_current_user_role') || 'Admin').toLowerCase();
    return role.indexOf('admin') !== -1;
  }

  function hideNode(node) {
    if (!node) return;
    const row = node.closest('li') || node.closest('.menu-item') || node.closest('.nav-item');
    if (row) {
      row.remove();
      return;
    }
    node.remove();
  }

  function applyAdminLinkGate() {
    if (isAdminUser()) return;

    document.querySelectorAll('a[href*="Admin_Users.html"], #menuAdmin, [data-admin-link]').forEach(hideNode);

    const page = currentPage();
    if (page.indexOf('Admin_') === 0) {
      window.location.replace('./index.html');
    }
  }

  function applyCoreNavFilter() {
    const blockedHrefs = [
      'ChangeOrder',
      'Connections',
      'AdvertiserSalesOrder',
      'CAD.html',
      'CADv1.html',
      'CAD-mockup.html'
    ];

    document.querySelectorAll('a[href]').forEach(function (anchor) {
      const href = anchor.getAttribute('href') || '';
      if (!href) return;
      if (blockedHrefs.some(function (token) { return href.indexOf(token) !== -1; })) {
        hideNode(anchor);
      }
    });

    document.querySelectorAll('#newChangeOrderBtn, #addToCOBtn, [id*="ChangeOrder"], [onclick*="openCOPickerModal"]').forEach(function (node) {
      if (node && node.tagName === 'A') {
        hideNode(node);
      } else if (node) {
        node.remove();
      }
    });

    document.querySelectorAll('button').forEach(function (button) {
      const text = (button.textContent || '').trim().toLowerCase();
      if (text.indexOf('change order') !== -1) {
        button.remove();
      }
    });
  }

  function applyBlockedPageRedirects() {
    const redirects = {
      'WFAdvertiserConnections.html': './WFAdvertiserDetails.html',
      'CampaignsConnections.html': './CampaignDetails.html',
      'AdGroupsConnections.html': './AdGroupDetails.html',
      'AdvertiserSalesOrder.html': './WFAdvertiserDetails.html',
      'CAD.html': './index.html',
      'CADv1.html': './index.html',
      'CAD-mockup.html': './index.html',
      'AdvertiserChangeOrders.html': './WFAdvertiserDetails.html',
      'ChangeOrderList.html': './index.html',
      'ChangeOrderDetail.html': './index.html',
      'ChangeOrderDetails.html': './index.html'
    };

    const page = currentPage();
    if (!redirects[page]) return;

    const params = new URLSearchParams(window.location.search);
    if (params.get('allowLegacy') === '1') return;

    window.location.replace(redirects[page]);
  }

  function cloneNodeWithoutListeners(node) {
    if (!node || !node.parentNode) return node;
    const clone = node.cloneNode(true);
    node.parentNode.replaceChild(clone, node);
    return clone;
  }

  function escapeHtml(text) {
    return String(text == null ? '' : text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getFieldDisplayValue(field) {
    if (!field) return '';
    if (field.tagName === 'SELECT') {
      const selected = field.options[field.selectedIndex];
      return selected ? selected.textContent.trim() : '';
    }
    return String(field.value || '').trim();
  }

  function makeReviewHtml(title, fields) {
    const rows = fields.map(function (fieldMeta) {
      const el = document.getElementById(fieldMeta.id);
      let value = getFieldDisplayValue(el);
      if (!value && typeof fieldMeta.fallback === 'function') {
        value = String(fieldMeta.fallback() || '').trim();
      }
      if (!value) value = '—';
      return '<div class="flex items-start justify-between border-b border-gray-100 py-2 gap-4">' +
        '<span class="text-sm text-gray-500">' + escapeHtml(fieldMeta.label) + '</span>' +
        '<span class="text-sm font-medium text-gray-900 text-right">' + escapeHtml(value) + '</span>' +
        '</div>';
    }).join('');

    return [
      '<div class="rounded-lg border border-gray-200 bg-white p-4">',
      '<h3 class="text-xl font-semibold text-gray-900 mb-2">Review & Create</h3>',
      '<p class="text-sm text-gray-600 mb-4">Confirm Beacon fields before creating this ' + escapeHtml(title) + '.</p>',
      rows,
      '</div>'
    ].join('');
  }

  function applyTwoStepWizard(config) {
    const modal = document.getElementById(config.modalId);
    let step1 = document.querySelector(config.step1Selector || '.wizard-step[data-step="1"]');
    let step2 = document.querySelector(config.step2Selector || '.wizard-step[data-step="2"]');
    const step3 = document.querySelector(config.step3Selector || '.wizard-step[data-step="3"]');
    const content1 = document.querySelector(config.content1Selector || '.wizard-content[data-content="1"]');
    const content2 = document.querySelector(config.content2Selector || '.wizard-content[data-content="2"]');
    const content3 = document.querySelector(config.content3Selector || '.wizard-content[data-content="3"]');

    if (!step1 || !step2 || !content1 || !content2) return;

    if (step3) step3.style.display = 'none';
    if (content3) content3.style.display = 'none';

    step1 = cloneNodeWithoutListeners(step1);
    step2 = cloneNodeWithoutListeners(step2);

    const step2Title = step2.querySelector('.step-title');
    const step2Sub = step2.querySelector('.step-subtitle');
    if (step2Title) step2Title.textContent = 'Review & Create';
    if (step2Sub) step2Sub.textContent = 'Confirm Beacon fields';

    Array.from(content2.children).forEach(function (child) {
      child.style.display = 'none';
    });

    let review = document.getElementById(config.reviewId);
    if (!review) {
      review = document.createElement('div');
      review.id = config.reviewId;
      content2.appendChild(review);
    }
    review.style.display = 'block';

    const progressBar = document.getElementById(config.progressBarId);
    const progressText = document.getElementById(config.progressTextId);
    const currentStepText = document.getElementById(config.currentStepId);
    const stepCounterWrap = currentStepText ? currentStepText.parentElement : null;

    if (stepCounterWrap) {
      stepCounterWrap.childNodes.forEach(function (node) {
        if (node.nodeType === Node.TEXT_NODE) {
          node.textContent = node.textContent.replace(/of\\s*\\d+/i, 'of 2');
        }
      });
    }

    let prevBtn = document.getElementById(config.prevBtnId);
    let nextBtn = document.getElementById(config.nextBtnId);
    prevBtn = cloneNodeWithoutListeners(prevBtn);
    nextBtn = cloneNodeWithoutListeners(nextBtn);

    const createButtons = (config.createBtnIds || []).map(function (id) {
      return document.getElementById(id);
    }).filter(Boolean);

    let currentStep = 1;

    function updateIndicators(activeStep) {
      [step1, step2].forEach(function (stepEl, index) {
        const stepNum = index + 1;
        const numberEl = stepEl.querySelector('.step-number');
        const titleEl = stepEl.querySelector('.step-title');

        stepEl.classList.remove('active', 'completed');

        if (stepNum < activeStep) {
          stepEl.classList.add('completed');
          if (numberEl) {
            numberEl.classList.remove('bg-blue-600', 'bg-gray-300', 'text-gray-600');
            numberEl.classList.add('bg-green-600', 'text-white');
            numberEl.textContent = '✓';
          }
          if (titleEl) {
            titleEl.classList.remove('text-gray-600');
            titleEl.classList.add('text-gray-900');
          }
        } else if (stepNum === activeStep) {
          stepEl.classList.add('active');
          if (numberEl) {
            numberEl.classList.remove('bg-gray-300', 'bg-green-600', 'text-gray-600');
            numberEl.classList.add('bg-blue-600', 'text-white');
            numberEl.textContent = String(stepNum);
          }
          if (titleEl) {
            titleEl.classList.remove('text-gray-600');
            titleEl.classList.add('text-gray-900');
          }
        } else {
          if (numberEl) {
            numberEl.classList.remove('bg-blue-600', 'bg-green-600', 'text-white');
            numberEl.classList.add('bg-gray-300', 'text-gray-600');
            numberEl.textContent = String(stepNum);
          }
          if (titleEl) {
            titleEl.classList.remove('text-gray-900');
            titleEl.classList.add('text-gray-600');
          }
        }
      });
    }

    function hideConnectorSections() {
      if (!modal) return;
      modal.querySelectorAll('#connectorsContent, #dspFieldsSection, #adServerFieldsSection, #noPlatformsMessage').forEach(function (node) {
        node.style.display = 'none';
      });
    }

    function renderReview() {
      review.innerHTML = makeReviewHtml(config.entityLabel, config.reviewFields || []);
    }

    function goToStep(step) {
      currentStep = step === 2 ? 2 : 1;

      updateIndicators(currentStep);
      content1.classList.toggle('active', currentStep === 1);
      content2.classList.toggle('active', currentStep === 2);
      content1.style.display = currentStep === 1 ? '' : 'none';
      content2.style.display = currentStep === 2 ? '' : 'none';

      const progress = currentStep === 1 ? 50 : 100;
      if (progressBar) progressBar.style.width = progress + '%';
      if (progressText) progressText.textContent = progress + '%';
      if (currentStepText) currentStepText.textContent = String(currentStep);

      if (prevBtn) prevBtn.disabled = currentStep === 1;
      if (nextBtn) nextBtn.classList.toggle('hidden', currentStep === 2);
      createButtons.forEach(function (button) {
        button.classList.toggle('hidden', currentStep !== 2);
      });

      if (currentStep === 2) {
        renderReview();
      }

      hideConnectorSections();
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', function () {
        goToStep(1);
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        if (typeof config.validateStep1 === 'function' && !config.validateStep1()) {
          return;
        }
        goToStep(2);
      });
    }

    [step1, step2].forEach(function (stepEl, index) {
      stepEl.addEventListener('click', function () {
        const target = index + 1;
        if (target === 1 || currentStep === 2) {
          goToStep(target);
        }
      });
    });

    goToStep(1);
  }

  function initAdvertiserWizard() {
    if (currentPage() !== 'index.html') return;

    const wizardConfig = {
      modalId: 'createAdvertiserModal',
      openTriggerId: 'createBtn',
      prevBtnId: 'wizardPrevBtn',
      nextBtnId: 'wizardNextBtn',
      createBtnIds: ['createAdvertiserBtn'],
      progressBarId: 'wizardProgressBar',
      progressTextId: 'wizardProgressText',
      currentStepId: 'wizardCurrentStep',
      reviewId: 'phase1AdvertiserReview',
      entityLabel: 'advertiser',
      reviewFields: [
        { id: 'accountNumber', label: 'Account Number', fallback: function () { return document.getElementById('noCrmAccount')?.checked ? 'No CRM Account' : ''; } },
        { id: 'advertiserName', label: 'Account Name' },
        { id: 'totalInvoiceImpressions', label: 'Total Invoice Impressions' },
        { id: 'totalInvoiceBudget', label: 'Total Invoice Budget' },
        { id: 'totalImpressions', label: 'Total Impressions' },
        { id: 'totalBudget', label: 'Total Budget' }
      ],
      validateStep1: function () {
        const name = (document.getElementById('advertiserName')?.value || '').trim();
        const account = (document.getElementById('accountNumber')?.value || '').trim();
        const noCrm = !!document.getElementById('noCrmAccount')?.checked;

        if (!name) {
          document.getElementById('advertiserName')?.focus();
          return false;
        }
        if (!account && !noCrm) {
          document.getElementById('accountNumber')?.focus();
          return false;
        }
        return true;
      }
    };

    applyTwoStepWizard(wizardConfig);

    const trigger = document.getElementById('createBtn');
    if (trigger && !trigger.dataset.phase1AdvertiserWizardBound) {
      trigger.dataset.phase1AdvertiserWizardBound = '1';
      trigger.addEventListener('click', function () {
        // Re-apply after legacy wizard rebinds listeners.
        setTimeout(function () { applyTwoStepWizard(wizardConfig); }, 180);
      });
    }
  }

  function initCampaignWizard() {
    if (currentPage() !== 'AdvertiserCampaigns.html') return;

    const wizardConfig = {
      modalId: 'createCampaignModal',
      openTriggerId: 'createBtn',
      prevBtnId: 'campaignWizardPrevBtn',
      nextBtnId: 'campaignWizardNextBtn',
      createBtnIds: ['campaignCreateBtn', 'createAndAddAdGroup'],
      progressBarId: 'campaignWizardProgressBar',
      progressTextId: 'campaignWizardProgressText',
      currentStepId: 'campaignWizardCurrentStep',
      reviewId: 'phase1CampaignReview',
      entityLabel: 'campaign',
      reviewFields: [
        { id: 'beaconCampaignName', label: 'Campaign Name' },
        { id: 'beaconTemplate', label: 'Template' },
        { id: 'beaconDspImpressions', label: 'DSP Impressions' },
        { id: 'beaconStartDate', label: 'Start Date' },
        { id: 'beaconEndDate', label: 'End Date' }
      ],
      validateStep1: function () {
        const form = document.getElementById('createCampaignForm');
        return !!(form && form.reportValidity());
      }
    };

    applyTwoStepWizard(wizardConfig);

    const trigger = document.getElementById('createBtn');
    if (trigger && !trigger.dataset.phase1CampaignWizardBound) {
      trigger.dataset.phase1CampaignWizardBound = '1';
      trigger.addEventListener('click', function () {
        setTimeout(function () { applyTwoStepWizard(wizardConfig); }, 140);
      });
    }
  }

  function initAdGroupWizard() {
    const page = currentPage();
    if (page !== 'AdvertiserAdGroup.html' && page !== 'CampaignsAdGroup.html') return;

    const wizardConfig = {
      modalId: 'createAdGroupModal',
      openTriggerId: 'createBtn',
      prevBtnId: 'wizardPrevBtn',
      nextBtnId: 'wizardNextBtn',
      createBtnIds: ['createAdGroupBtn'],
      progressBarId: 'wizardProgressBar',
      progressTextId: 'wizardProgressText',
      currentStepId: 'wizardCurrentStep',
      reviewId: 'phase1AdGroupReview',
      entityLabel: 'ad group',
      reviewFields: [
        { id: 'beaconAdGroupName', label: 'Ad Group Name' },
        { id: 'beaconCampaign', label: 'Campaign' },
        { id: 'beaconTemplate', label: 'Template' },
        { id: 'beaconMultiviewTactic', label: 'Tactic' },
        { id: 'beaconMultiviewClassification', label: 'MV Classification' },
        { id: 'beaconAudience', label: 'Audience' },
        { id: 'beaconGeoTarget', label: 'Geo Target' },
        { id: 'beaconStartDate', label: 'Start Date' },
        { id: 'beaconEndDate', label: 'End Date' },
        { id: 'beaconImpressions', label: 'Impressions' },
        { id: 'beaconLandingPage', label: 'Landing Page' }
      ],
      validateStep1: function () {
        const form = document.getElementById('createAdGroupForm');
        return !!(form && form.reportValidity());
      }
    };

    applyTwoStepWizard(wizardConfig);

    const trigger = document.getElementById('createBtn');
    if (trigger && !trigger.dataset.phase1AdGroupWizardBound) {
      trigger.dataset.phase1AdGroupWizardBound = '1';
      trigger.addEventListener('click', function () {
        setTimeout(function () { applyTwoStepWizard(wizardConfig); }, 120);
      });
    }
  }

  function init() {
    applyBlockedPageRedirects();
    applyAdminLinkGate();
    applyCoreNavFilter();

    if (window.beaconAdminConfig && typeof window.beaconAdminConfig.bindFormOptions === 'function') {
      window.beaconAdminConfig.bindFormOptions(document);
    }

    initAdvertiserWizard();
    initCampaignWizard();
    initAdGroupWizard();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
