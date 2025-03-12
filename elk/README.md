
### version
ELK - 8.5.1 
# helm list
NAME         	CHART              	APP VERSION
elasticsearch   elasticsearch-8.5.1	8.5.1      
filebeat     	filebeat-8.5.1     	8.5.1      
kibana       	kibana-8.5.1       	8.5.1      
logstash     	logstash-8.5.1     	8.5.1  

Secret
   - elasticsearch-master-credentials
   - elasticsearch-master-certs
   - logstash-ca (수동 생성)

### Command


helm repo add elastic https://helm.elastic.co
helm repo list
helm upgrade elasticsearch elastic/elasticsearch -f elastic-values.yaml
helm upgrade kibana elastic/kibana -f kibana-values.yaml
helm upgrade logstash elastic/logstash -f logstash-values.yaml 
helm upgrade filebeat elastic/filebeat -f filebeat-values.yaml

# kubectl command
kubectl logs -f -l app=sl-main-api-prod -f | grep -E "LOG|DEBUG|(ERROR(.*\n.*){3})"