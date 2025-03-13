package main

import (
	"context"
	"flag"
	"fmt"
	"log"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/util/homedir"
	"path/filepath"
)

func main() {
	// Kubeconfig 파일 경로 설정
	kubeconfig := ""
	if home := homedir.HomeDir(); home != "" {
		kubeconfig = filepath.Join(home, ".kube", "config")
	}

	// 클러스터에 연결하기 위해 kubeconfig 파일을 사용하여 클라이언트 구성
	config, err := clientcmd.BuildConfigFromFlags("", kubeconfig)
	if err != nil {
		log.Fatalf("Error creating kubeconfig: %s", err.Error())
	}

	// Kubernetes 클라이언트 생성
	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		log.Fatalf("Error creating clientset: %s", err.Error())
	}
	namespace := "default" 

	// 이벤트를 감지하기 위한 watch 설정
	watcher, err := clientset.CoreV1().Events(namespace).Watch(context.TODO(), metav1.ListOptions{})
	if err != nil {
		log.Fatalf("Error watching events: %s", err.Error())
	}
	defer watcher.Stop()

	// 이벤트를 실시간으로 수신하면서 출력
	for event := range watcher.ResultChan() {
		switch event.Type {
		case "ADDED":
			fmt.Printf("New Event Added: %s\n", event.Object)
		case "MODIFIED":
			fmt.Printf("Event Modified: %s\n", event.Object)
		case "DELETED":
			fmt.Printf("Event Deleted: %s\n", event.Object)
		}
	}
}
