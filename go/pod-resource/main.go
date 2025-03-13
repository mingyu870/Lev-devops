package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/slack-go/slack"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/tools/clientcmd"
	metricsv1 "k8s.io/metrics/pkg/client/clientset/versioned"
)

const (
	kubeconfigPath  = "/root/.kube/config" 
	slackWebhookURL = "slack-bot-token(xoxo)"
)

func main() {
	config, err := clientcmd.BuildConfigFromFlags("", kubeconfigPath)
	if err != nil {
		log.Fatalf("Error building kubeconfig: %s", err.Error())
	}

	metricsClient, err := metricsv1.NewForConfig(config)
	if err != nil {
		log.Fatalf("Error creating metrics client: %s", err.Error())
	}

	for {
		checkPodResources(metricsClient)
		time.Sleep(30 * time.Second)
	}
}

func checkPodResources(metricsClient *metricsv1.Clientset) {
	podsMetrics, err := metricsClient.MetricsV1beta1().PodMetricses("default").List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		log.Fatalf("Error fetching pod metrics: %s", err.Error())
	}

	for _, pod := range podsMetrics.Items {
		for _, container := range pod.Containers {
			cpuUsage := container.Usage["cpu"]
			memUsage := container.Usage["memory"]

			// 예시로 CPU와 메모리의 기본 사용량을 100m, 200Mi로 가정
			thresholdCPU := 1 * 1000000000
			thresholdMemory := 100 * 1024 * 1024

			// CPU와 Memory가 기준 값에 비해 얼마나 올라갔는지 확인
			cpuFactor := float64(cpuUsage.Value()) / float64(thresholdCPU)
			memFactor := float64(memUsage.Value()) / float64(thresholdMemory)

			// 실제 CPU와 메모리 사용량을 사람이 읽을 수 있는 형식으로 변환
			cpuUsageStr := formatCPUUsage(cpuUsage.Value())
			memUsageStr := formatMemoryUsage(memUsage.Value())

			// 알림 기준
			if cpuFactor >= 4 || memFactor >= 4 {
				message := "Critical alert: Pod " + pod.Name + " exceeded 4x resource usage (CPU: " + cpuUsageStr + ", Memory: " + memUsageStr + ")"
				sendSlackNotification(message)
			} else if cpuFactor >= 3 || memFactor >= 3 {
				message := "Warning: Pod " + pod.Name + " exceeded 3x resource usage (CPU: " + cpuUsageStr + ", Memory: " + memUsageStr + ")"
				sendSlackNotification(message)
			} else if cpuFactor >= 2 || memFactor >= 2 {
				message := "Info: Pod " + pod.Name + " exceeded 2x resource usage (CPU: " + cpuUsageStr + ", Memory: " + memUsageStr + ")"
				sendSlackNotification(message)
			}
		}
	}
}

// CPU usage를 millicores로 포맷하는 함수
func formatCPUUsage(cpuValue int64) string {
    milliCores := float64(cpuValue) / 1000000.0
    if milliCores < 0.01 {
        return "<0.01m"
    }
    return fmt.Sprintf("%.3fm", milliCores)
}

// Memory usage를 Mi로 포맷하는 함수
func formatMemoryUsage(memValue int64) string {

	return fmt.Sprintf("%.2fMi", float64(memValue)/1024.0/1024.0)
}

func sendSlackNotification(message string) {
	client := slack.New(slackWebhookURL)
	channelID := "#26_devops"
	attachment := slack.Attachment{
		Text: message,
	}
	_, _, err := client.PostMessage(channelID,
		slack.MsgOptionText(message, false),
		slack.MsgOptionAttachments(attachment),
	)
	if err != nil {
		log.Printf("Error sending message to Slack: %s", err.Error())
	}
}