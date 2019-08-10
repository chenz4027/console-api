/** *****************************************************************************
 * Licensed Materials - Property of IBM
 * (c) Copyright IBM Corporation 2018. All Rights Reserved.
 *
 * Note to U.S. Government Users Restricted Rights:
 * Use, duplication or disclosure restricted by GSA ADP Schedule
 * Contract with IBM Corp.
 ****************************************************************************** */

export const typeDef = `
type cemIncident {
  id: String
  createdTime: String
  lastChanged: String
  priority: String
  escalated: String
  correlationDetails: JSON
  incidentURL: String
  eventsURL: String
  timelineURL: String
  owner: String
  team: String
  state: String
  summary: String
  description: String
}
`;

export const resolver = {
  Query: {
    cemIncidents: (parent, args, { cemModel, req }) =>
      cemModel.getIncidents({ ...args, req }),
    cemIncidentsForApplication: (parent, args, { cemModel, req }) =>
      cemModel.getIncidentsForApplication({ ...args, req }),
  },
};