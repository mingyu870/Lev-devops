#!/bin/bash
APPS=$(kubectl get applications --all-namespaces -o jsonpath='{range .items[*]}{.metadata.namespace},{.metadata.name}{"\n"}{end}')

while IFS=',' read -r NAMESPACE APP_NAME; do
    echo "Patching app: $APP_NAME in namespace: $NAMESPACE"

    kubectl patch app $APP_NAME -n $NAMESPACE -p '{"metadata": {"annotations": {"notifications.argoproj.io/subscribe.app-sync-succeeded.slack":"#25_cicd_alarm"}}}' --type merge
    kubectl patch app $APP_NAME -n $NAMESPACE -p '{"metadata": {"annotations": {"notifications.argoproj.io/subscribe.app-sync-failed.slack":"#25_cicd_alarm"}}}' --type merge
    kubectl patch app $APP_NAME -n $NAMESPACE -p '{"metadata": {"annotations": {"notifications.argoproj.io/subscribe.app-sync-running.slack":"#25_cicd_alarm"}}}' --type merge
    kubectl patch app $APP_NAME -n $NAMESPACE -p '{"metadata": {"annotations": {"notifications.argoproj.io/subscribe.app-sync-status-unknown.slack":"#25_cicd_alarm"}}}' --type merge
    kubectl patch app $APP_NAME -n $NAMESPACE -p '{"metadata": {"annotations": {"notifications.argoproj.io/subscribe.app-health-degraded.slack":"#25_cicd_alarm"}}}' --type merge
    kubectl patch app $APP_NAME -n $NAMESPACE -p '{"metadata": {"annotations": {"notifications.argoproj.io/subscribe.app-deployed.slack":"#25_cicd_alarm"}}}' --type merge

    echo "Finished patching $APP_NAME"
    echo "-------------------------"
done <<< "$APPS"

echo "All applications have been patched."
