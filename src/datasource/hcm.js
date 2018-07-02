/** *****************************************************************************
 * Licensed Materials - Property of IBM
 * (c) Copyright IBM Corporation 2018. All Rights Reserved.
 *
 * Note to U.S. Government Users Restricted Rights:
 * Use, duplication or disclosure restricted by GSA ADP Schedule
 * Contract with IBM Corp.
 ****************************************************************************** */

export {
  createDashboard,
  deleteApplication,
  deleteHelmRelease,
  deleteHelmRepository,
  deployApplication,
  installHelmChart,
  registerApplication,
  setRepo,
  undeployApplication,
} from './lib/hcm-client';
