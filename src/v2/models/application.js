/** *****************************************************************************
 * Licensed Materials - Property of IBM
 * (c) Copyright IBM Corporation 2018. All Rights Reserved.
 *
 * Note to U.S. Government Users Restricted Rights:
 * Use, duplication or disclosure restricted by GSA ADP Schedule
 * Contract with IBM Corp.
 ****************************************************************************** */

import _ from 'lodash';
import KubeModel from './kube';
import logger from '../lib/logger';

const filterByName = (names, items) =>
  items.filter(item => names.find(name => name.name === item.metadata.name));

export default class ApplicationModel extends KubeModel {
  async createApplication(resources) {
    const appKinds = {
      Application: 'applications',
      ConfigMap: 'configmaps',
      DeployableOverride: 'deployableoverrides',
      Deployable: 'deployables',
      PlacementPolicy: 'placementpolicies',
    };

    if (!resources.find(resource => resource.kind === 'Application')) {
      return {
        errors: [{ message: 'Must contain a resource with kind "Application".' }],
      };
    }

    const result = await Promise.all(resources.map((resource) => {
      const namespace = _.get(resource, 'metadata.namespace', 'default');
      if (appKinds[resource.kind] === 'undefined') {
        return Promise.resolve({
          status: 'Failure',
          message: `Invalid Kind: ${resource.kind}`,
        });
      }
      return this.kubeConnector.post(`/apis/mcm.ibm.com/v1alpha1/namespaces/${namespace}/${appKinds[resource.kind]}`, resource)
        .catch(err => ({
          status: 'Failure',
          message: err.message,
        }));
    }));

    const errors = [];
    result.forEach((item) => {
      if (item.code >= 400 || item.status === 'Failure') {
        errors.push({ message: item.message });
      }
    });

    return {
      errors,
      result,
    };
  }

  /**
   * NOTE: This deletes the top level Application and any child resources the user has selected.
   * Child resources: Deployables, PlacementPolicies, AppRelationships and DeployableOverrides.
   */
  async deleteApplication(path, resources) {
    const errors = await this.deleteAppResource(resources);
    if (errors && errors.length > 0) {
      throw new Error(`MCM ERROR: Unable to delete application resource(s) - ${JSON.stringify(errors)}`);
    }

    const response = await this.kubeConnector.delete(path);
    if (response.code || response.message) {
      throw new Error(`MCM ERROR ${response.code} - ${response.message}`);
    }
    return response.metadata.name;
  }

  async deleteAppResource(resources) {
    if (resources.length < 1) {
      logger.info('No Application resources selected for deletion');
      return [];
    }

    const result = await Promise.all(resources.map(resource =>
      this.kubeConnector.delete(resource.selfLink)
        .catch(err => ({
          status: 'Failure',
          message: err.message,
        }))));

    const errors = [];
    result.forEach((item) => {
      if (item.code >= 400 || item.status === 'Failure') {
        errors.push({ message: item.message });
      }
    });

    return errors;
  }

  async getApplications(name, namespace = 'default') {
    let apps;
    if (name) {
      apps = await this.kubeConnector.getResources(
        ns => `/apis/mcm.ibm.com/v1alpha1/namespaces/${ns}/applications/${name}`,
        { namespaces: [namespace] },
      );
    } else {
      apps = await this.kubeConnector.getResources(ns => `/apis/mcm.ibm.com/v1alpha1/namespaces/${ns}/applications`);
    }

    return apps
      .map(app => ({
        applicationRelationshipNames: app.status.ApplicationRelationships || [],
        applicationWorkNames: app.metadata.name || '',
        dashboard: app.status.Dashboard || {},
        deployableNames: app.status.Deployables || [],
        placementPolicyNames: app.status.PlacementPolicies || [],
        metadata: app.metadata,
        raw: app,
        selector: app.spec.selector,
      }));
  }

  async getApplicationRelationships(selector = {}) {
    const { matchNames } = selector;

    const response = await this.kubeConnector.getResources(
      ns => `/apis/mcm.ibm.com/v1alpha1/namespaces/${ns}/applicationrelationships`,
      { kind: 'ApplicationRelationship' },
    );
    const appRelationships = matchNames ? filterByName(matchNames, response) : response;

    return appRelationships.map(ar => ({
      destination: ar.spec.destination,
      metadata: ar.metadata,
      raw: ar,
      source: ar.spec.source,
      type: ar.spec.type,
    }));
  }

  async getDeployables(selector = {}) {
    const { matchNames } = selector;

    const response = await this.kubeConnector.getResources(
      ns => `/apis/mcm.ibm.com/v1alpha1/namespaces/${ns}/deployables`,
      { kind: 'Deployable' },
    );
    const deployables = matchNames ? filterByName(matchNames, response) : response;

    return deployables.map(deployable => ({
      dependencies: deployable.spec.dependencies && deployable.spec.dependencies.map(dep => ({
        name: dep.destination.name,
        kind: dep.destination.kind,
      })),
      deployer: deployable.spec.deployer && deployable.spec.deployer.helm,
      metadata: deployable.metadata,
      raw: deployable,
    }));
  }

  async getPlacementPolicies(selector = {}) {
    const { matchNames } = selector;

    const response = await this.kubeConnector.getResources(
      ns => `/apis/mcm.ibm.com/v1alpha1/namespaces/${ns}/placementpolicies`,
      { kind: 'PlacementPolicy' },
    );
    const placementPolicies = matchNames ? filterByName(matchNames, response) : response;

    return placementPolicies.map(pp => ({
      clusterLabels: pp.spec.clusterLabels,
      metadata: pp.metadata,
      raw: pp,
      clusterReplicas: pp.spec.clusterReplicas,
      resourceSelector: pp.spec.resourceSelector,
      status: pp.status,
    }));
  }

  async getApplicationWorks(selector = {}) {
    const { appName } = selector;

    const response = await this.kubeConnector.getResources(ns => `/apis/mcm.ibm.com/v1alpha1/namespaces/${ns}/works?labelSelector=deployable=${appName},placementBinding=${appName}`);
    return response.map(work => ({
      metadata: work.metadata,
      release: _.get(work, 'status.result.metadata.name', '-'),
      cluster: work.spec.cluster.name,
      status: work.status.type,
      reason: work.status.reason || '-',
      result: Object.assign(
        _.get(work, 'spec.helm', {}),
        _.get(work, 'status.result.spec', {}),
      ),
    }));
  }
}
